from fastapi import FastAPI

app = FastAPI(
    title="Job Application Tracker API",
    version="0.1.0",
    description="Backend API for Job Application Tracker",
)


@app.get("/health")
def health_check():
    return {"status": "ok"}
