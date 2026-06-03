import axios from "axios";

const BASE = import.meta.env.DEV
  ? "/moodle-api"
  : import.meta.env.VITE_MOODLE_URL;

export const moodleClient = axios.create({
  baseURL: BASE,
});

moodleClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("moodle_token");
  if (token) {
    config.params = { ...config.params, wstoken: token };
  }
  return config;
});
