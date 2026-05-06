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
  modules: CourseModule[];
}

export interface CourseModule {
  id: number;
  name: string;
  modname: string;
  contents?: ModuleContent[];
}

export interface CourseOverviewFile {
  fileurl: string;
  mimetype: string;
}

export interface ModuleContent {
  type: string;
  filename: string;
  fileurl: string;
  filesize: number;
  mimetype?: string;
}

export interface OfflineCourse {
  id: number;
  fullname: string;
  shortname: string;
  downloadedAt: number;
  sections: CourseSection[];
}
