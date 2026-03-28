import base64
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.database import get_db
from app.face_utils import classify_behavior, compare_faces, detect_faces_in_frame

router = APIRouter(prefix="/api/detection", tags=["detection"])

_sessions: Dict[str, dict] = {}


class StartSessionRequest(BaseModel):
    camera_id: str = "cam_01"


class FrameRequest(BaseModel):
    image_base64: str
    camera_id: str = "cam_01"


class DetectionResult(BaseModel):
    name: str
    user_id: Optional[str] = None
    bbox: List[int]
    event_type: str
    confidence: float


async def _load_known_encodings() -> dict:
    db = get_db()
    cursor = await db.execute("SELECT * FROM users WHERE face_encodings != '[]'")
    rows = await cursor.fetchall()
    known = {}
    for row in rows:
        encodings = json.loads(row["face_encodings"]) if row["face_encodings"] else []
        if encodings:
            known[str(row["id"])] = {"name": row["name"], "encodings": encodings}
    return known


async def _log_event(user_id, user_name, event_type, confidence, camera_id):
    db = get_db()
    await db.execute(
        "INSERT INTO events (user_id, user_name, event_type, confidence, timestamp, camera_id) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, user_name, event_type, confidence, datetime.utcnow().isoformat(), camera_id),
    )
    await db.commit()


async def _mark_attendance(user_id, user_name):
    db = get_db()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    existing = await (await db.execute(
        "SELECT id FROM attendance WHERE user_id = ? AND date = ?", (user_id, today)
    )).fetchone()
    if not existing:
        await db.execute(
            "INSERT INTO attendance (user_id, user_name, date, check_in_time, status) VALUES (?, ?, ?, ?, ?)",
            (user_id, user_name, today, datetime.utcnow().isoformat(), "present"),
        )
        await db.commit()


@router.post("/start")
async def start_detection(camera_id: str = Query("cam_01")):
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "session_id": session_id,
        "camera_id": camera_id,
        "started_at": datetime.utcnow().isoformat(),
        "active": True,
        "frames_processed": 0,
        "detections_count": 0,
        "attended_user_ids": set(),
        "prev_locations": {},
    }
    return {
        "session_id": session_id,
        "camera_id": camera_id,
        "status": "running",
        "started_at": _sessions[session_id]["started_at"],
    }


@router.post("/stop")
async def stop_detection(session_id: Optional[str] = None):
    if session_id:
        session = _sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found.")
        session["active"] = False
        session["stopped_at"] = datetime.utcnow().isoformat()
        return {
            "session_id": session_id,
            "status": "stopped",
            "frames_processed": session["frames_processed"],
            "detections_count": session["detections_count"],
        }

    stopped = []
    for sid, session in _sessions.items():
        if session["active"]:
            session["active"] = False
            session["stopped_at"] = datetime.utcnow().isoformat()
            stopped.append(sid)
    return {"stopped_sessions": stopped, "status": "all_stopped"}


@router.post("/frame", response_model=List[DetectionResult])
async def process_frame(req: FrameRequest):
    active_session = None
    for session in _sessions.values():
        if session["active"] and session["camera_id"] == req.camera_id:
            active_session = session
            break
    if not active_session:
        for session in _sessions.values():
            if session["active"]:
                active_session = session
                break

    try:
        image_bytes = base64.b64decode(req.image_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data.")

    face_locations, face_encodings, frame_w, frame_h, face_landmarks_list = detect_faces_in_frame(image_bytes)

    if not face_locations:
        if active_session:
            active_session["frames_processed"] += 1
        return []

    known_encodings = await _load_known_encodings()
    results: List[DetectionResult] = []

    for i, (loc, enc) in enumerate(zip(face_locations, face_encodings)):
        top, right, bottom, left = loc

        matched, user_id, user_name, confidence = compare_faces(known_encodings, enc, tolerance=0.5)

        if not matched:
            user_id = None
            user_name = "Unknown"
            confidence = 0.0

        landmarks = None
        if face_landmarks_list and i < len(face_landmarks_list):
            landmarks = face_landmarks_list[i]

        prev_locs = None
        if active_session and user_id:
            prev_locs = active_session["prev_locations"].get(user_id, [])

        if matched:
            event_type = classify_behavior(
                face_location=loc, frame_width=frame_w, frame_height=frame_h,
                face_landmarks=landmarks, prev_locations=prev_locs,
            )
        else:
            event_type = "unknown_person"

        if active_session and user_id:
            history = active_session["prev_locations"].setdefault(user_id, [])
            history.append(loc)
            if len(history) > 10:
                active_session["prev_locations"][user_id] = history[-10:]

        detection_confidence = confidence if matched else 0.5

        results.append(DetectionResult(
            name=user_name, user_id=user_id, bbox=[top, right, bottom, left],
            event_type=event_type, confidence=round(detection_confidence, 4),
        ))

        await _log_event(user_id, user_name, event_type, round(detection_confidence, 4), req.camera_id)

        if matched and user_id and active_session:
            if user_id not in active_session["attended_user_ids"]:
                await _mark_attendance(user_id, user_name)
                active_session["attended_user_ids"].add(user_id)

    if active_session:
        active_session["frames_processed"] += 1
        active_session["detections_count"] += len(results)

    return results


@router.get("/status")
async def detection_status():
    active = []
    inactive = []
    for sid, session in _sessions.items():
        info = {
            "session_id": sid,
            "camera_id": session["camera_id"],
            "started_at": session["started_at"],
            "frames_processed": session["frames_processed"],
            "detections_count": session["detections_count"],
            "attended_users": len(session["attended_user_ids"]),
        }
        if session["active"]:
            info["status"] = "running"
            active.append(info)
        else:
            info["status"] = "stopped"
            info["stopped_at"] = session.get("stopped_at")
            inactive.append(info)

    return {"active_sessions": active, "inactive_sessions": inactive, "total_active": len(active)}
