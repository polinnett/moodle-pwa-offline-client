import axios from "axios";

const MOODLE_URL = import.meta.env.VITE_MOODLE_URL || "http://localhost:8080";

export const moodleClient = axios.create({
  baseURL: MOODLE_URL,
});

moodleClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("moodle_token");
  if (token && config.params) {
    config.params.wstoken = token;
  } else if (token) {
    config.params = { wstoken: token };
  }
  return config;
});

export { MOODLE_URL };
