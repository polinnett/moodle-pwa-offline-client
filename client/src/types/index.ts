export interface AuthToken {
  token: string;
  privatetoken?: string;
}

export interface Course {
  id: number;
  fullname: string;
  shortname: string;
  summary: string;
  courseimage?: string;
  overviewfiles?: CourseOverviewFile[];
}

export interface CourseSection {
  id: number;
  name: string;
  visible?: number;
  summary?: string;
  modules: CourseModule[];
}

export interface CourseModule {
  id: number;
  name: string;
  modname: string;
  modicon?: string;
  visible?: number;
  contents?: ModuleContent[];
  description?: string;
}

export interface CourseOverviewFile {
  fileurl: string;
  mimetype: string;
}

export interface ModuleContent {
  type: string;
  filename: string;
  filepath?: string | null;
  filesize: number;
  fileurl: string;
  content?: string | null;
  timecreated?: number | null;
  timemodified?: number | null;
  sortorder?: number | null;
  mimetype?: string;
  userid?: number | null;
  author?: string | null;
  license?: string | null;
}

export interface OfflineCourse {
  id: number;
  fullname: string;
  shortname: string;
  summary?: string;
  downloadedAt: number;
  sections: CourseSection[];
  fullyDownloaded?: boolean;
}

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

export interface UserInfo {
  fullname: string;
  firstname: string;
  lastname: string;
  username: string;
  userpictureurl: string;
  userissiteadmin: boolean;
  sitename: string;
}

export interface MoodleUser {
  id: number;
  fullname: string;
  email: string;
  profileimageurl: string;
  lastaccess: number;
}
