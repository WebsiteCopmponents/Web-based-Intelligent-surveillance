import os
import json
import aiosqlite

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "surveillance.db")

db: aiosqlite.Connection = None


async def connect_to_db():
    global db
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row

    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")

    await db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            student_id TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            registered_at TEXT NOT NULL,
            face_encodings TEXT DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            user_name TEXT DEFAULT 'Unknown',
            event_type TEXT NOT NULL,
            confidence REAL NOT NULL,
            timestamp TEXT NOT NULL,
            camera_id TEXT DEFAULT 'cam_01'
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            date TEXT NOT NULL,
            check_in_time TEXT NOT NULL,
            status TEXT DEFAULT 'present',
            UNIQUE(user_id, date)
        );

        CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
        CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
    """)
    await db.commit()
    print(f"Connected to SQLite database at {DB_PATH}")


async def close_db():
    global db
    if db:
        await db.close()
        print("Closed SQLite connection")


def get_db() -> aiosqlite.Connection:
    return db
