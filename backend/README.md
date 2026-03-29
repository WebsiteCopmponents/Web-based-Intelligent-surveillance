# Backend - SurveillanceAI

FastAPI backend for face detection, recognition, behavior analysis, and attendance tracking.

## Files & Purpose

```
backend/
├── app/
│   ├── main.py            # App entry point - FastAPI setup, CORS, router registration
│   ├── database.py        # SQLite connection using aiosqlite, table creation
│   ├── models.py          # Pydantic models (UserCreate, Event, AttendanceRecord, etc.)
│   ├── face_utils.py      # Core AI logic:
│   │                        - encode_face()        → extracts 128-d face encoding from image
│   │                        - compare_faces()       → matches face against registered users
│   │                        - classify_behavior()   → detects: normal_writing, looking_around,
│   │                                                  mass_copying, phone_usage, talking
│   │                        - detect_faces_in_frame()→ full pipeline for live frame processing
│   │                        - Uses face_recognition (dlib) if available, falls back to OpenCV
│   │
│   └── routers/
│       ├── users.py       # /api/users/* endpoints
│       │                    - POST /register         → create student profile
│       │                    - POST /{id}/upload-face  → upload face images, extract encodings
│       │                    - GET /                   → list all students
│       │                    - GET /{id}               → get single student
│       │                    - DELETE /{id}            → delete student + related data
│       │
│       ├── detection.py   # /api/detection/* endpoints
│       │                    - POST /start             → start detection session
│       │                    - POST /stop              → stop detection session
│       │                    - POST /frame             → process base64 frame, detect faces,
│       │                                                recognize users, classify behavior,
│       │                                                auto-log events, auto-mark attendance
│       │                    - GET /status              → active/inactive session info
│       │
│       ├── events.py      # /api/events/* endpoints
│       │                    - POST /                  → manually create event
│       │                    - GET /                   → list events (filter by user, type, date)
│       │                    - GET /recent             → last 50 events
│       │                    - GET /types              → all event type labels
│       │
│       └── analytics.py   # /api/analytics/* endpoints
│                            - GET /user/{id}          → per-student: event breakdown,
│                                                        attendance rate, recent events
│                            - GET /overview           → class: present/absent count,
│                                                        event distribution
│                            - GET /events-timeline    → hourly/daily event buckets
│
├── requirements.txt       # Python dependencies
└── surveillance.db        # SQLite database (auto-created on first run)
```

## Database Tables

| Table | Purpose |
|-------|---------|
| users | Student profiles + face encodings (stored as JSON array of 128-d vectors) |
| events | Detection events: who, what behavior, confidence, timestamp, camera |
| attendance | Daily attendance records: user, date, check-in time, status |

## Behavior Detection Logic (face_utils.py)

The system classifies student behavior using face position heuristics:

| Behavior | How it's detected |
|----------|-------------------|
| normal_writing | Face looking down/forward (norm_y > 0.55) |
| looking_around | Head turned left/right (yaw_ratio < 0.3 or > 0.7) |
| mass_copying | Rapid lateral head movement between frames |
| phone_usage | Face in lower frame + small face size (looking down at lap) |
| unknown_person | Face detected but doesn't match any registered user |

## Run

```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

API docs available at http://localhost:8000/docs
