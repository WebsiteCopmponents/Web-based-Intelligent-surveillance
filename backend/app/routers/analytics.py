from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.database import get_db
from app.models import AnalyticsResponse, EVENT_TYPES

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/user/{user_id}", response_model=AnalyticsResponse)
async def user_analytics(user_id: str):
    db = get_db()

    user = await (await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Event breakdown
    cursor = await db.execute(
        "SELECT event_type, COUNT(*) as count FROM events WHERE user_id = ? GROUP BY event_type",
        (user_id,),
    )
    rows = await cursor.fetchall()
    breakdown = {}
    total_events = 0
    for r in rows:
        breakdown[r["event_type"]] = r["count"]
        total_events += r["count"]

    # Attendance rate
    user_attendance = await (await db.execute(
        "SELECT COUNT(*) as cnt FROM attendance WHERE user_id = ?", (user_id,)
    )).fetchone()
    all_dates = await (await db.execute("SELECT COUNT(DISTINCT date) as cnt FROM attendance")).fetchone()
    total_class_days = max(all_dates["cnt"], 1)
    attendance_rate = round(user_attendance["cnt"] / total_class_days, 4)

    # Recent events
    cursor = await db.execute(
        "SELECT * FROM events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20",
        (user_id,),
    )
    recent_rows = await cursor.fetchall()
    recent_events = [
        {
            "id": str(r["id"]),
            "event_type": r["event_type"],
            "confidence": r["confidence"],
            "timestamp": r["timestamp"],
            "camera_id": r["camera_id"],
        }
        for r in recent_rows
    ]

    return AnalyticsResponse(
        user_id=user_id,
        user_name=user["name"],
        total_events=total_events,
        event_breakdown=breakdown,
        attendance_rate=attendance_rate,
        recent_events=recent_events,
    )


@router.get("/overview")
async def class_overview(date: Optional[str] = Query(None)):
    db = get_db()
    target_date = date or datetime.utcnow().strftime("%Y-%m-%d")

    present = await (await db.execute(
        "SELECT COUNT(*) as cnt FROM attendance WHERE date = ?", (target_date,)
    )).fetchone()

    total_users = await (await db.execute("SELECT COUNT(*) as cnt FROM users")).fetchone()

    present_count = present["cnt"]
    absent_count = max(total_users["cnt"] - present_count, 0)

    # Event distribution
    start_dt = target_date
    end_dt = target_date + "T23:59:59"
    cursor = await db.execute(
        "SELECT event_type, COUNT(*) as count FROM events WHERE timestamp >= ? AND timestamp <= ? GROUP BY event_type",
        (start_dt, end_dt),
    )
    rows = await cursor.fetchall()
    event_distribution = {r["event_type"]: r["count"] for r in rows}

    # Present students
    cursor = await db.execute("SELECT * FROM attendance WHERE date = ?", (target_date,))
    att_rows = await cursor.fetchall()
    present_list = [
        {"user_id": str(r["user_id"]), "user_name": r["user_name"], "check_in_time": r["check_in_time"]}
        for r in att_rows
    ]

    return {
        "date": target_date,
        "total_registered": total_users["cnt"],
        "total_present": present_count,
        "total_absent": absent_count,
        "event_distribution": event_distribution,
        "present_students": present_list,
    }


@router.get("/events-timeline")
async def events_timeline(
    bucket: str = Query("hourly"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    db = get_db()
    conditions = []
    params = []

    if date_from:
        conditions.append("timestamp >= ?")
        params.append(date_from)
    if date_to:
        conditions.append("timestamp <= ?")
        params.append(date_to + "T23:59:59")

    where = (" WHERE " + " AND ".join(conditions)) if conditions else ""

    if bucket == "hourly":
        group_expr = "SUBSTR(timestamp, 1, 13)"
    else:
        group_expr = "SUBSTR(timestamp, 1, 10)"

    query = f"""
        SELECT {group_expr} as bucket_label, event_type, COUNT(*) as count
        FROM events{where}
        GROUP BY bucket_label, event_type
        ORDER BY bucket_label
    """
    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()

    # Aggregate into timeline buckets
    buckets = {}
    for r in rows:
        label = r["bucket_label"]
        if label not in buckets:
            buckets[label] = {"bucket": label, "total": 0, "event_types": {}}
        buckets[label]["total"] += r["count"]
        buckets[label]["event_types"][r["event_type"]] = r["count"]

    return {"bucket_type": bucket, "timeline": list(buckets.values())}
