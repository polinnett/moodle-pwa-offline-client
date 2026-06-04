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