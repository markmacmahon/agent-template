from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi_pagination import Page, Params
from fastapi_pagination.ext.sqlalchemy import apaginate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import User, get_async_session
from app.models import App
from app.schemas import AppRead, AppCreate, AppUpdate
from app.users import current_active_user

router = APIRouter(tags=["app"])


def transform_apps(apps):
    return [AppRead.model_validate(app) for app in apps]


@router.get("/", response_model=Page[AppRead])
async def read_app(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
):
    params = Params(page=page, size=size)
    query = select(App).filter(App.user_id == user.id)
    return await apaginate(db, query, params, transformer=transform_apps)


@router.post("/", response_model=AppRead)
async def create_app(
    app: AppCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    db_app = App(**app.model_dump(), user_id=user.id)
    db.add(db_app)
    await db.commit()
    await db.refresh(db_app)
    return db_app


@router.get("/{app_id}", response_model=AppRead)
async def get_app(
    app_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    result = await db.execute(
        select(App).filter(App.id == app_id, App.user_id == user.id)
    )
    app = result.scalars().first()

    if not app:
        raise HTTPException(status_code=404, detail="App not found or not authorized")

    return app


@router.patch("/{app_id}", response_model=AppRead)
async def update_app(
    app_id: UUID,
    app_update: AppUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    result = await db.execute(
        select(App).filter(App.id == app_id, App.user_id == user.id)
    )
    app = result.scalars().first()

    if not app:
        raise HTTPException(status_code=404, detail="App not found or not authorized")

    update_data = app_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(app, field, value)

    await db.commit()
    await db.refresh(app)
    return app


@router.delete("/{app_id}")
async def delete_app(
    app_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    result = await db.execute(
        select(App).filter(App.id == app_id, App.user_id == user.id)
    )
    app = result.scalars().first()

    if not app:
        raise HTTPException(status_code=404, detail="App not found or not authorized")

    await db.delete(app)
    await db.commit()

    return {"message": "App successfully deleted"}
