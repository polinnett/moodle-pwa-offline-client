import { openDB } from "idb";
import type { DBSchema } from "idb";
import type { Course } from "../types/course";

interface AppDB extends DBSchema {
  courses: {
    key: number;
    value: Course;
  };
}

export const dbPromise = openDB<AppDB>("moodle-pwa-db", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("courses")) {
      db.createObjectStore("courses", { keyPath: "id" });
    }
  },
});
