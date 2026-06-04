from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import get_db
from models import Note, Course

router = APIRouter(prefix="/notes", tags=["notes"])

class NoteCreate(BaseModel):
    course_id: int
    lesson_id: int
    title: Optional[str] = None
    text: str
    timestamp_seconds: Optional[float] = None

class NoteUpdate(BaseModel):
    text: str

class NoteBatchItem(BaseModel):
    course_id: int
    lesson_id: int
    title: Optional[str] = None
    text: str
    timestamp_seconds: Optional[float] = None
    created_at: Optional[datetime] = None

@router.get("/")
async def get_notes(lesson_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Note).where(Note.lesson_id == lesson_id, Note.is_deleted == False)
    )
    return result.scalars().all()

@router.post("/")
async def create_note(note: NoteCreate, db: AsyncSession = Depends(get_db)):
    existing_course = await db.get(Course, note.course_id)
    if not existing_course:
        new_course = Course(course_id=note.course_id, fullname=f"Course {note.course_id}")
        db.add(new_course)

    new_note = Note(**note.model_dump())
    db.add(new_note)
    await db.commit()
    await db.refresh(new_note)
    return new_note

@router.patch("/{note_id}")
async def update_note(note_id: int, data: NoteUpdate, db: AsyncSession = Depends(get_db)):
    note = await db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Заметка не найдена")
    note.text = data.text
    note.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(note)
    return note

@router.delete("/{note_id}")
async def delete_note(note_id: int, db: AsyncSession = Depends(get_db)):
    note = await db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Заметка не найдена")
    note.is_deleted = True
    note.updated_at = datetime.utcnow()
    await db.commit()
    return {"ok": True}

@router.post("/batch")
async def sync_notes(notes: list[NoteBatchItem], db: AsyncSession = Depends(get_db)):
    saved = []
    for item in notes:
        existing_course = await db.get(Course, item.course_id)
        if not existing_course:
            new_course = Course(course_id=item.course_id, fullname=f"Course {item.course_id}")
            db.add(new_course)

        new_note = Note(
            course_id=item.course_id,
            lesson_id=item.lesson_id,
            text=item.text,
            timestamp_seconds=item.timestamp_seconds,
            created_at=item.created_at or datetime.utcnow(),
        )
        db.add(new_note)
        saved.append(new_note)

    await db.commit()
    return {"synced": len(saved)}

@router.get("/sync")
async def get_updates(since: datetime, lesson_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Note).where(
            Note.lesson_id == lesson_id,
            Note.updated_at > since
        )
    )
    return result.scalars().all()