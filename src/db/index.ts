import Dexie, { type Table } from "dexie";
import type { OfflineCourse } from "../types";

class MoodleOfflineDB extends Dexie {
  courses!: Table<OfflineCourse>;

  constructor() {
    super("MoodleOfflineDB");

    this.version(1).stores({
      courses: "id, fullname, downloadedAt",
    });
  }
}

export const db = new MoodleOfflineDB();

export const saveCourseOffline = async (course: OfflineCourse) => {
  await db.courses.put(course);
};

export const getOfflineCourses = async () => {
  return db.courses.toArray();
};

export const getOfflineCourse = async (id: number) => {
  return db.courses.get(id);
};

export const deleteOfflineCourse = async (id: number) => {
  await db.courses.delete(id);
};
