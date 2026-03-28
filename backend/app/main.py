from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import connect_to_db, close_db
from app.routers import users, events, analytics, detection


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_db()
    yield
    await close_db()


app = FastAPI(
    title="Intelligent Surveillance System",
    description="Backend API for face detection, recognition, behaviour analysis, and attendance tracking.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(events.router)
app.include_router(analytics.router)
app.include_router(detection.router)


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "message": "Intelligent Surveillance System API"}


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "healthy"}
