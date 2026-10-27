import logging

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException


class APIError(Exception):
    def __init__(self, status: int, code: str, message: str):
        self.status = status
        self.code = code
        self.message = message


def install_handlers(app):
    @app.exception_handler(SQLAlchemyError)
    async def database_error(request: Request, exc: SQLAlchemyError):
        logging.getLogger(__name__).error(
            "Database operation failed: %s", type(exc).__name__
        )
        return JSONResponse(
            {
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Database operation failed",
                }
            },
            status_code=503,
        )

    @app.exception_handler(APIError)
    async def api_error(request: Request, exc: APIError):
        headers = {"WWW-Authenticate": "Bearer"} if exc.status == 401 else None
        return JSONResponse(
            {"error": {"code": exc.code, "message": exc.message}},
            status_code=exc.status,
            headers=headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        invalid_status = any(
            error["loc"][-1:] == ("status",) for error in exc.errors()
        )
        code = "INVALID_STATUS" if invalid_status else "VALIDATION_ERROR"
        details = [
            {
                "field": ".".join(map(str, error["loc"])),
                "message": error["msg"],
            }
            for error in exc.errors()
        ]
        return JSONResponse(
            {
                "error": {
                    "code": code,
                    "message": "Invalid request",
                    "details": details,
                }
            },
            status_code=422,
        )

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        return JSONResponse(
            {
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": str(exc.detail),
                }
            },
            status_code=exc.status_code,
            headers=exc.headers,
        )