const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const createApiError = (message, status) => {
  const error = new Error(message);
  error.status = status;
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

const authHeaders = () => {
  const token = localStorage.getItem("ccp_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const requestJson = async (url, options, fallbackErrorMessage) => {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw createApiError("Cannot connect to backend API. Make sure backend server is running.", 0);
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

/* ── Job endpoints ── */

export const listJobsRequest = async (query = {}) => {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.tag) params.set("tag", query.tag);
  if (query.mine) params.set("mine", "true");

  return requestJson(
    `${API_BASE_URL}/api/jobs?${params.toString()}`,
    { headers: authHeaders() },
    "Could not load jobs"
  );
};

export const getJobRequest = async (jobId) => {
  return requestJson(
    `${API_BASE_URL}/api/jobs/${jobId}`,
    { headers: authHeaders() },
    "Could not load job"
  );
};

export const createJobRequest = async (payload) => {
  return requestJson(
    `${API_BASE_URL}/api/jobs`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) },
    "Could not create job"
  );
};

export const deleteJobRequest = async (jobId) => {
  return requestJson(
    `${API_BASE_URL}/api/jobs/${jobId}`,
    { method: "DELETE", headers: authHeaders() },
    "Could not delete job"
  );
};

/* ── Application endpoints ── */

export const applyToJobRequest = async (jobId, payload) => {
  return requestJson(
    `${API_BASE_URL}/api/applications/${jobId}/apply`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) },
    "Could not submit application"
  );
};

export const checkApplicationRequest = async (jobId) => {
  return requestJson(
    `${API_BASE_URL}/api/applications/${jobId}/check`,
    { headers: authHeaders() },
    "Could not check application status"
  );
};

export const listMyApplicationsRequest = async () => {
  return requestJson(
    `${API_BASE_URL}/api/applications/mine`,
    { headers: authHeaders() },
    "Could not load applications"
  );
};

export const listApplicantsRequest = async (jobId) => {
  return requestJson(
    `${API_BASE_URL}/api/applications/${jobId}/applicants`,
    { headers: authHeaders() },
    "Could not load applicants"
  );
};

export const downloadApplicantsExcelUrl = (jobId) => {
  return `${API_BASE_URL}/api/applications/${jobId}/applicants/download`;
};
