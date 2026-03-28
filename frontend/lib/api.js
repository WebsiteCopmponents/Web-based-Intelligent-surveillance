import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// ---- Users / Students ----

export async function registerUser(data) {
  const response = await api.post("/users/register", data);
  return response.data;
}

export async function uploadFace(userId, files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const response = await api.post(`/users/${userId}/upload-face`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getUsers() {
  const response = await api.get("/users/");
  return response.data;
}

export async function getUser(id) {
  const response = await api.get(`/users/${id}`);
  return response.data;
}

export async function deleteUser(id) {
  const response = await api.delete(`/users/${id}`);
  return response.data;
}

// ---- Events ----

export async function getEvents(filters = {}) {
  
  const params = new URLSearchParams();
  if (filters.event_type) params.append("event_type", filters.event_type);
  if (filters.user_name) params.append("user_name", filters.user_name);
  if (filters.start_date) params.append("start_date", filters.start_date);
  if (filters.end_date) params.append("end_date", filters.end_date);
  if (filters.skip !== undefined) params.append("skip", filters.skip);
  if (filters.limit !== undefined) params.append("limit", filters.limit);
  const response = await api.get(`/events/?${params.toString()}`);
  return response.data;
}

export async function getRecentEvents() {
  const response = await api.get("/events/recent");
  return response.data;
}

export async function getEventTypes() {
  const response = await api.get("/events/types");
  return response.data;
}

// ---- Analytics ----

export async function getUserAnalytics(userId) {
  const response = await api.get(`/analytics/user/${userId}`);
  return response.data;
}

export async function getOverview() {
  const response = await api.get("/analytics/overview");
  return response.data;
}

export async function getEventsTimeline() {
  const response = await api.get("/analytics/events-timeline");
  return response.data;
}

// ---- Detection ----

export async function startDetection() {
  const response = await api.post("/detection/start");
  return response.data;
}

export async function stopDetection() {
  const response = await api.post("/detection/stop");
  return response.data;
}

export async function processFrame(base64Image) {
  const response = await api.post("/detection/frame", {
    image_base64: base64Image,
  });
  return response.data;
}

export async function getDetectionStatus() {
  const response = await api.get("/detection/status");
  return response.data;
}

export default api;
