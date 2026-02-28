const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const createApiError = (message, status, data) => {
  const error = new Error(message);
  error.status = status;
  error.data = data;
  return error;
};

const parseResponseData = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return { raw: text };
};

const requestJson = async (url, options, fallbackErrorMessage) => {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw createApiError("Cannot connect to backend API.", 0);
  }

  const data = await parseResponseData(response);

  if (!response.ok) {
    const message = data?.message || fallbackErrorMessage;
    throw createApiError(message, response.status, data);
  }

  return data;
};

const authHeaders = () => {
  const token = localStorage.getItem("ccp_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

/* ─── Counsellors ─── */

export const listCounsellorsRequest = async () => {
  return requestJson(`${API_BASE_URL}/api/counsellors`, { method: "GET" }, "Failed to load counsellors");
};

/* ─── Sessions ─── */

export const requestSessionRequest = async (payload) => {
  return requestJson(
    `${API_BASE_URL}/api/sessions/request`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) },
    "Failed to request session"
  );
};

export const listSessionsRequest = async () => {
  return requestJson(
    `${API_BASE_URL}/api/sessions`,
    { method: "GET", headers: authHeaders() },
    "Failed to load sessions"
  );
};

export const acceptSessionRequest = async (sessionId) => {
  return requestJson(
    `${API_BASE_URL}/api/sessions/${sessionId}/accept`,
    { method: "PATCH", headers: authHeaders() },
    "Failed to accept session"
  );
};

export const rejectSessionRequest = async (sessionId) => {
  return requestJson(
    `${API_BASE_URL}/api/sessions/${sessionId}/reject`,
    { method: "PATCH", headers: authHeaders() },
    "Failed to reject session"
  );
};

export const rescheduleSessionRequest = async (sessionId, rescheduledAt) => {
  return requestJson(
    `${API_BASE_URL}/api/sessions/${sessionId}/reschedule`,
    { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ rescheduledAt }) },
    "Failed to reschedule session"
  );
};

export const confirmSessionRequest = async (sessionId) => {
  return requestJson(
    `${API_BASE_URL}/api/sessions/${sessionId}/confirm`,
    { method: "PATCH", headers: authHeaders() },
    "Failed to confirm session"
  );
};

export const cancelSessionRequest = async (sessionId) => {
  return requestJson(
    `${API_BASE_URL}/api/sessions/${sessionId}/cancel`,
    { method: "PATCH", headers: authHeaders() },
    "Failed to cancel session"
  );
};
