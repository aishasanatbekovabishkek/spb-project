from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router
from app.config import settings
from app.errors import install_handlers
from app.provider import provider


@asynccontextmanager
async def lifespan(app):
    if len(settings.jwt_secret) < 32 or settings.jwt_secret.startswith("replace_"):
        raise RuntimeError(
            "Set JWT_SECRET to a random secret of at least 32 characters"
        )
    yield
    provider.close()


app = FastAPI(
    title="Job Application Tracker API",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

install_handlers(app)
app.include_router(router)


@app.get("/health")
def health_check():
    return {"status": "ok"}