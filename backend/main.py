from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from core.limiter import limiter
from db.mongo import init_db_indexes
from ml.inference import load_ml_models
from routers import auth, warehouses, predictions, alerts, analytics, assistant, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB indexes and load ML model artifacts once
    try:
        await init_db_indexes()
    except Exception as e:
        print(f"Warning: DB index initialization deferred: {e}")
    load_ml_models()
    yield
    # Shutdown: cleanup if needed

app = FastAPI(
    title="Smart Warehouse CRM & Prediction Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# App-level slowapi rate limiter wiring
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Register API routers
app.include_router(auth.router)
app.include_router(warehouses.router)
app.include_router(predictions.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(assistant.router)
app.include_router(admin.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
