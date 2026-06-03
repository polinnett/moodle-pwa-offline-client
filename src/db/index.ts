import Dexie, { type Table } from "dexie";
import type { OfflineCourse } from "../types";

export interface OfflineLesson {
  id: number;
  courseId: number;
  name: string;
  html: string;
  savedAt: number;
}

export interface Transcription {
  id: string;
  text: string;
  savedAt: number;
}

class MoodleOfflineDB extends Dexie {
  courses!: Table<OfflineCourse>;
  lessons!: Table<OfflineLesson>;
  transcriptions!: Table<Transcription>;

  constructor() {
    super("MoodleOfflineDB");
    this.version(1).stores({
      courses: "id, fullname, downloadedAt",
      lessons: "id, courseId, savedAt",
    });
    this.version(2).stores({
      courses: "id, fullname, downloadedAt, fullyDownloaded",
      lessons: "id, courseId, savedAt",
      transcriptions: "id, savedAt",
    });
  }
}

export const db = new MoodleOfflineDB();

export const saveCourseOffline = async (course: OfflineCourse) => {
  await db.courses.put(course);
};
export const getOfflineCourses = async () => db.courses.toArray();
export const getOfflineCourse = async (id: number) => db.courses.get(id);
export const deleteOfflineCourse = async (id: number) => {
  await db.courses.delete(id);
};

export const saveLessonOffline = async (lesson: OfflineLesson) => {
  await db.lessons.put(lesson);
};
export const getOfflineLesson = async (id: number) => db.lessons.get(id);
export const deleteOfflineLesson = async (id: number) => {
  await db.lessons.delete(id);
};

export const saveTranscription = async (id: string, text: string) => {
  await db.transcriptions.put({ id, text, savedAt: Date.now() });
};

export const getTranscription = async (id: string) => {
  return db.transcriptions.get(id);
};

export const deleteTranscription = async (id: string) => {
  await db.transcriptions.delete(id);
};
