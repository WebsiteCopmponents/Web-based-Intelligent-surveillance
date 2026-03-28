import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, UploadFile, File

from app.database import get_db
from app.face_utils import encode_face
from app.models import UserCreate, UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])


def _row_to_response(row) -> UserResponse:
    encodings = json.loads(row["face_encodings"]) if row["face_encodings"] else []
    return UserResponse(
        id=str(row["id"]),
        name=row["name"],
        student_id=row["student_id"],
        email=row["email"],
        registered_at=datetime.fromisoformat(row["registered_at"]),
        face_registered=len(encodings) > 0,
    )


@router.post("/register", response_model=UserResponse, status_code=201)
async def register_user(user: UserCreate):
    db = get_db()

    existing = await db.execute(
        "SELECT id FROM users WHERE student_id = ? OR email = ?",
        (user.student_id, user.email),
    )
    if await existing.fetchone():
        raise HTTPException(status_code=409, detail="A user with this student_id or email already exists.")

    now = datetime.utcnow().isoformat()
    cursor = await db.execute(
        "INSERT INTO users (name, student_id, email, registered_at, face_encodings) VALUES (?, ?, ?, ?, ?)",
        (user.name, user.student_id, user.email, now, "[]"),
    )
    await db.commit()

    row = await (await db.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,))).fetchone()
    return _row_to_response(row)


@router.post("/{user_id}/upload-face", response_model=dict)
async def upload_face(user_id: str, files: List[UploadFile] = File(...)):
    db = get_db()

    row = await (await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found.")

    if len(files) < 1 or len(files) > 5:
        raise HTTPException(status_code=400, detail="Please upload between 1 and 5 images.")

    all_encodings = json.loads(row["face_encodings"]) if row["face_encodings"] else []
    faces_found = 0

    for upload_file in files:
        contents = await upload_file.read()
        if not contents:
            continue
        encodings = encode_face(contents)
        if encodings:
            all_encodings.append(encodings[0])
            faces_found += 1

    if faces_found == 0:
        raise HTTPException(status_code=400, detail="No faces detected in any of the uploaded images.")

    await db.execute(
        "UPDATE users SET face_encodings = ? WHERE id = ?",
        (json.dumps(all_encodings), user_id),
    )
    await db.commit()

    return {"message": f"Successfully registered {faces_found} face encoding(s).", "total_encodings": len(all_encodings)}


@router.get("", response_model=List[UserResponse])
async def list_users():
    db = get_db()
    cursor = await db.execute("SELECT * FROM users ORDER BY registered_at DESC")
    rows = await cursor.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    db = get_db()
    row = await (await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found.")
    return _row_to_response(row)


@router.delete("/{user_id}", response_model=dict)
async def delete_user(user_id: str):
    db = get_db()
    cursor = await db.execute("DELETE FROM users WHERE id = ?", (user_id,))
    await db.commit()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="User not found.")

    await db.execute("DELETE FROM events WHERE user_id = ?", (user_id,))
    await db.execute("DELETE FROM attendance WHERE user_id = ?", (user_id,))
    await db.commit()

    return {"message": "User deleted successfully."}
