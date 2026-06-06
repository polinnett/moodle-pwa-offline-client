from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import CourseSnapshot, CourseUpdate
from datetime import datetime
from utils import get_user_hash, compute_hash, diff_modules, SnapshotItem
import json

router = APIRouter(prefix="/updates", tags=["updates"])

class CheckRequest(BaseModel):
    course_id: int
    course_name: str
    modules: list[SnapshotItem]

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