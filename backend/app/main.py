import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.config import get_settings
from app.database import create_tables

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="Organizador Financeiro do Casal",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
from app.routers import (  # noqa: E402
    auth, transactions, categories, investments, purchase_goals, dashboard,
    category_rules, connections, settlement, budgets, insights, review,
    transfer_rules,
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(investments.router, prefix="/api/v1")
app.include_router(purchase_goals.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(category_rules.router, prefix="/api/v1")
app.include_router(connections.router, prefix="/api/v1")
app.include_router(settlement.router, prefix="/api/v1")
app.include_router(budgets.router, prefix="/api/v1")
app.include_router(insights.router, prefix="/api/v1")
app.include_router(review.router, prefix="/api/v1")
app.include_router(transfer_rules.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}


# ─── Serve React frontend (built by nixpacks) ────────────────────────────────

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.normpath(os.path.join(_backend_dir, "..", "frontend", "dist"))

if os.path.isdir(DIST_DIR):
    _assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    def spa_response(path: str) -> FileResponse:
        response = FileResponse(path)
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        # Serve specific static files (favicon, robots.txt, etc.)
        candidate = os.path.normpath(os.path.join(DIST_DIR, full_path))
        if candidate.startswith(DIST_DIR) and os.path.isfile(candidate):
            return spa_response(candidate) if os.path.basename(candidate) == "index.html" else FileResponse(candidate)
        # Fallback: let React Router handle the route
        return spa_response(os.path.join(DIST_DIR, "index.html"))
