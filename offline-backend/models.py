from sqlalchemy import Column, Integer, String, Text, Boolean, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Course(Base):
    __tablename__ = "courses"

    course_id = Column(Integer, primary_key=True, index=True)
    fullname = Column(String, nullable=False)
    saved_at = Column(DateTime, default=datetime.utcnow)

    notes = relationship("Note", back_populates="course")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.course_id"), nullable=False)
    lesson_id = Column(Integer, nullable=False)
    title = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    timestamp_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)

    user_token_hash = Column(String, nullable=False, index=True)

    course = relationship("Course", back_populates="notes")

class CourseSnapshot(Base):
    __tablename__ = "course_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, nullable=False, index=True)
    user_token_hash = Column(String, nullable=False, index=True)
    fullname = Column(String, nullable=False)
    content_hash = Column(String, nullable=False)
    snapshot_json = Column(Text, nullable=False)
    checked_at = Column(DateTime, default=datetime.utcnow)

    updates = relationship("CourseUpdate", back_populates="snapshot")


class CourseUpdate(Base):
    __tablename__ = "course_updates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_id = Column(Integer, ForeignKey("course_snapshots.id"), nullable=False)
    course_id = Column(Integer, nullable=False)
    course_name = Column(String, nullable=False)
    user_token_hash = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    detected_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)

    snapshot = relationship("CourseSnapshot", back_populates="updates")