from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.database import get_db
from app.models import Event, EventResponse, EVENT_TYPES

router = APIRouter(prefix="/api/events", tags=["events"])


def _row_to_response(row) -> EventResponse:
    return EventResponse(
        id=str(row["id"]),
        user_id=str(row["user_id"]) if row["user_id"] else None,
        user_name=row["user_name"] or "Unknown",
        event_type=row["event_type"],
        confidence=row["confidence"],
        timestamp=datetime.fromisoformat(row["timestamp"]),
        camera_id=row["camera_id"] or "cam_01",
    )


@router.post("", response_model=EventResponse, status_code=201)
async def create_event(event: Event):
    db = get_db()

    if event.event_type not in EVENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid event_type. Must be one of: {EVENT_TYPES}")

    now = (event.timestamp or datetime.utcnow()).isoformat()
    cursor = await db.execute(
        "INSERT INTO events (user_id, user_name, event_type, confidence, timestamp, camera_id) VALUES (?, ?, ?, ?, ?, ?)",
        (event.user_id, event.user_name, event.event_type, event.confidence, now, event.camera_id),
    )
    await db.commit()

    row = await (await db.execute("SELECT * FROM events WHERE id = ?", (cursor.lastrowid,))).fetchone()
    return _row_to_response(row)


@router.get("", response_model=List[EventResponse])
async def list_events(
    user_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
):
    db = get_db()
    conditions = []
    params = []

    if user_id:
        conditions.append("user_id = ?")
        params.append(user_id)

    if event_type:
        if event_type not in EVENT_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid event_type. Must be one of: {EVENT_TYPES}")
        conditions.append("event_type = ?")
        params.append(event_type)

    if date_from:
        conditions.append("timestamp >= ?")
        params.append(date_from)

    if date_to:
        conditions.append("timestamp <= ?")
        params.append(date_to + "T23:59:59")

    where = (" WHERE " + " AND ".join(conditions)) if conditions else ""
    query = f"SELECT * FROM events{where} ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, skip])

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/recent", response_model=List[EventResponse])
async def recent_events():
    db = get_db()
    cursor = await db.execute("SELECT * FROM events ORDER BY timestamp DESC LIMIT 50")
    rows = await cursor.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/types", response_model=List[str])
async def list_event_types():
    db = get_db()
    cursor = await db.execute("SELECT DISTINCT event_type FROM events")
    rows = await cursor.fetchall()
    stored = [r["event_type"] for r in rows]
    all_types = sorted(set(EVENT_TYPES) | set(stored))
    return all_types
