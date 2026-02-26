from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
from app.routers import auth, transactions, categories, investments, purchase_goals, dashboard  # noqa: E402

app.include_router(auth.router, prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(investments.router, prefix="/api/v1")
app.include_router(purchase_goals.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
