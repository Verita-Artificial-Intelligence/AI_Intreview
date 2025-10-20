"""
ASGI entrypoint for running the FastAPI application with uvicorn.

Allows launching the backend via `uvicorn server:app` while keeping the
main FastAPI application defined in `app.py`.
"""

from app import app

__all__ = ("app",)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
