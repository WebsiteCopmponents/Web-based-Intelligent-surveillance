# SurveillanceAI - Intelligent Surveillance System

Web-based intelligent surveillance system with face recognition, automated attendance tracking, behavior analysis, and real-time analytics.

## Features

- **Face Registration** - 3-step wizard: student info, face capture with quality scoring, confirmation
- **Live Monitoring** - Real-time camera feed with face detection and bounding box overlay
- **Face Recognition** - Detects and identifies registered students with confidence scores
- **Behavior Analysis** - Classifies events: normal writing, looking around, mass copying, phone usage, talking
- **Auto Attendance** - Marks attendance automatically when a registered face is detected
- **Event Logging** - Tracks all detection events with filters and search
- **Analytics Dashboard** - Per-student and class-wide analytics with charts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, Tailwind CSS, Recharts |
| Backend | FastAPI, Python |
| Database | SQLite (via aiosqlite) |
| Face Detection | OpenCV (Haar cascades), face_recognition (optional) |
| Icons | Lucide React |

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## External Camera Support

### USB Webcam

USB webcams work immediately with **zero code changes**. The browser auto-detects any connected USB camera device. Simply plug in the USB webcam and it will be available in the camera feed on the Monitor page.

To switch between multiple cameras (e.g., laptop webcam vs USB webcam), a camera selector dropdown can be added to the Monitor page that lists all available video input devices using the browser's `navigator.mediaDevices.enumerateDevices()` API.

### IP Camera / CCTV (RTSP)

IP cameras using RTSP protocol can be connected via a backend change. The backend reads the RTSP stream using OpenCV (`cv2.VideoCapture("rtsp://...")`) and serves frames to the frontend.

## Project Structure

```
surveilance/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── database.py          # SQLite connection (aiosqlite)
│   │   ├── models.py            # Pydantic models
│   │   ├── face_utils.py        # Face detection, encoding, behavior classification
│   │   └── routers/
│   │       ├── users.py         # User registration & face upload
│   │       ├── detection.py     # Live frame processing & recognition
│   │       ├── events.py        # Event logging & filtering
│   │       └── analytics.py     # Per-user & class analytics
│   ├── requirements.txt
│   └── surveillance.db          # Auto-created SQLite database
└── frontend/
    ├── app/
    │   ├── dashboard/page.jsx   # Overview dashboard
    │   ├── register/page.jsx    # 3-step student registration
    │   ├── monitor/page.jsx     # Live camera monitoring
    │   ├── events/page.jsx      # Event log
    │   ├── analytics/page.jsx   # Analytics & charts
    │   └── students/page.jsx    # Student list
    ├── components/              # Reusable UI components
    ├── lib/api.js               # API client (axios)
    └── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/users/register | Register a new student |
| POST | /api/users/{id}/upload-face | Upload face images for encoding |
| GET | /api/users | List all students |
| POST | /api/detection/start | Start detection session |
| POST | /api/detection/frame | Process a video frame |
| GET | /api/events/recent | Get recent detection events |
| GET | /api/analytics/user/{id} | Per-student analytics |
| GET | /api/analytics/overview | Class overview |
