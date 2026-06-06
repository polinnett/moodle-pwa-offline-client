from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import CourseSnapshot, CourseUpdate
from datetime import datetime
from pydantic import BaseModel
import hashlib
import json

router = APIRouter(prefix="/updates", tags=["updates"])

def get_user_hash(request: Request) -> str:
    token = request.headers.get("Authorization", "")
    return hashlib.sha256(token.encode()).hexdigest()

class SnapshotItem(BaseModel):
    id: int
    name: str
    timemodified: int = 0

class CheckRequest(BaseModel):
    course_id: int
    course_name: str
    modules: list[SnapshotItem]

def compute_hash(modules: list[SnapshotItem]) -> str:
    data = json.dumps([{"id": m.id, "name": m.name, "timemodified": m.timemodified} for m in modules], sort_keys=True)
    return hashlib.md5(data.encode()).hexdigest()

def diff_modules(old: list, new: list[SnapshotItem]) -> list[str]:
    old_map = {m["id"]: m for m in old}
    new_map = {m.id: m for m in new}
    changes = []

    for mid, item in new_map.items():
        if mid not in old_map:
            changes.append(f"Добавлен новый урок: «{item.name}»")
        elif old_map[mid]["name"] != item.name:
            changes.append(f"Переименован урок: «{old_map[mid]['name']}» в «{item.name}»")
        elif old_map[mid].get("timemodified", 0) != item.timemodified:
            changes.append(f"Обновлено содержимое урока: «{item.name}»")

    for mid, item in old_map.items():
        if mid not in new_map:
            changes.append(f"Удален урок: «{item['name']}»")

    return changes

@router.post("/check")
async def check_updates(
    data: CheckRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user_hash = get_user_hash(request)
    new_hash = compute_hash(data.modules)

    result = await db.execute(
        select(CourseSnapshot).where(
            CourseSnapshot.course_id == data.course_id,
            CourseSnapshot.user_token_hash == user_hash,
        )
    )
    snapshot = result.scalar_one_or_none()

    if not snapshot:
        snapshot = CourseSnapshot(
            course_id=data.course_id,
            user_token_hash=user_hash,
            fullname=data.course_name,
            content_hash=new_hash,
            snapshot_json=json.dumps([{"id": m.id, "name": m.name, "timemodified": m.timemodified} for m in data.modules]),
            checked_at=datetime.utcnow(),
        )
        db.add(snapshot)
        await db.commit()
        return {"has_updates": False, "updates": []}

    if snapshot.content_hash == new_hash:
        snapshot.checked_at = datetime.utcnow()
        await db.commit()
        return {"has_updates": False, "updates": []}

    old_modules = json.loads(snapshot.snapshot_json)
    changes = diff_modules(old_modules, data.modules)

    for change in changes:
        update = CourseUpdate(
            snapshot_id=snapshot.id,
            course_id=data.course_id,
            course_name=data.course_name,
            user_token_hash=user_hash,
            description=change,
            detected_at=datetime.utcnow(),
        )
        db.add(update)

    snapshot.content_hash = new_hash
    snapshot.snapshot_json = json.dumps([{"id": m.id, "name": m.name, "timemodified": m.timemodified} for m in data.modules])
    snapshot.checked_at = datetime.utcnow()
    await db.commit()

    return {"has_updates": True, "updates": changes}

@router.get("/")
async def get_updates(request: Request, course_id: int, db: AsyncSession = Depends(get_db)):
    user_hash = get_user_hash(request)
    result = await db.execute(
        select(CourseUpdate).where(
            CourseUpdate.user_token_hash == user_hash,
            CourseUpdate.course_id == course_id,
            CourseUpdate.is_read == False,
        ).order_by(CourseUpdate.detected_at.desc())
    )
    return result.scalars().all()

@router.patch("/{update_id}/read")
async def mark_read(update_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user_hash = get_user_hash(request)
    result = await db.execute(
        select(CourseUpdate).where(
            CourseUpdate.id == update_id,
            CourseUpdate.user_token_hash == user_hash,
        )
    )
    update = result.scalar_one_or_none()
    if update:
        update.is_read = True
        await db.commit()
    return {"ok": True}

@router.patch("/read-all")
async def mark_all_read(request: Request, db: AsyncSession = Depends(get_db)):
    user_hash = get_user_hash(request)
    result = await db.execute(
        select(CourseUpdate).where(
            CourseUpdate.user_token_hash == user_hash,
            CourseUpdate.is_read == False,
        )
    )
    updates = result.scalars().all()
    for u in updates:
        u.is_read = True
    await db.commit()
    return {"ok": True}