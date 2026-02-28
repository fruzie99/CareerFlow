const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const createApiError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const parseResponseData = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  return { raw: text };
};

const authHeaders = (contentType = "application/json") => {
  const token = localStorage.getItem("ccp_token");
  const headers = { Authorization: `Bearer ${token}` };
  if (contentType) headers["Content-Type"] = contentType;
  return headers;
};

const requestJson = async (url, options, fallbackErrorMessage) => {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw createApiError("Cannot connect to backend API. Make sure the server is running.", 0);
  }
  const data = await parseResponseData(response);
  if (!response.ok) {
    const message =
      data?.message ||
      (typeof data?.raw === "string" && data.raw.includes("<!DOCTYPE")
        ? "Backend API URL is incorrect or backend is not reachable."
        : fallbackErrorMessage);
    throw createApiError(message, response.status);
  }
  return data;
};

/* ── AI Chat ── */

export const aiChatRequest = async (message, history = [], context = "") => {
  return requestJson(
    `${API_BASE_URL}/api/ai/chat`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify({ message, history, context }) },
    "AI chat failed"
  );
};

/* ── Career Paths ── */

export const aiCareerPathsRequest = async () => {
  return requestJson(
    `${API_BASE_URL}/api/ai/career-paths`,
    { method: "GET", headers: authHeaders() },
    "Could not generate career paths"
  );
};

/* ── Resume Feedback ── */

export const aiResumeFeedbackRequest = async (pdfFile) => {
  const buffer = await pdfFile.arrayBuffer();
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/ai/resume-feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        Authorization: `Bearer ${localStorage.getItem("ccp_token")}`,
      },
      body: buffer,
    });
  } catch {
    throw createApiError("Cannot connect to backend API.", 0);
  }
  const data = await parseResponseData(response);
  if (!response.ok) {
    throw createApiError(data?.message || "Resume analysis failed", response.status);
  }
  return data;
};

/* ── Fit Score ── */

export const aiFitScoreRequest = async (jobDescription) => {
  return requestJson(
    `${API_BASE_URL}/api/ai/fit-score`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify({ jobDescription }) },
    "Could not calculate fit score"
  );
};

/* ── Career Path Tree ── */

export const aiCareerPathTreeRequest = async (goalRole) => {
  return requestJson(
    `${API_BASE_URL}/api/ai/career-path-tree`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify({ goalRole }) },
    "Could not generate career path tree"
  );
};
