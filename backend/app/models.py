from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── User Models ──────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    student_id: str = Field(..., min_length=1, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)


class UserResponse(BaseModel):
    id: str
    name: str
    student_id: str
    email: str
    registered_at: datetime
    face_registered: bool


# ── Event Models ─────────────────────────────────────────────────────────────

EVENT_TYPES = [
    "normal_writing",
    "looking_around",
    "mass_copying",
    "phone_usage",
    "talking",
    "absent_from_seat",
    "unknown_person",
]


class Event(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: str = "Unknown"
    event_type: str = Field(..., description="Type of detected event")
    confidence: float = Field(..., ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    camera_id: str = "cam_01"


class EventResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_name: str
    event_type: str
    confidence: float
    timestamp: datetime
    camera_id: str


# ── Attendance Models ────────────────────────────────────────────────────────

class AttendanceRecord(BaseModel):
    user_id: str
    user_name: str
    date: str
    check_in_time: datetime
    status: str = "present"


# ── Analytics Models ─────────────────────────────────────────────────────────

class AnalyticsResponse(BaseModel):
    user_id: str
    user_name: str
    total_events: int
    event_breakdown: dict
    attendance_rate: float
    recent_events: list
