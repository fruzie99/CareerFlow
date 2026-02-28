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

  if (data && typeof data === "object" && "raw" in data) {
    throw createApiError("Expected JSON from API but received HTML/text.", response.status);
  }

  return data;
};

export const signupRequest = async (payload) => {
  return requestJson(
    `${API_BASE_URL}/api/auth/signup`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Signup failed"
  );
};

export const loginRequest = async (payload) => {
  return requestJson(
    `${API_BASE_URL}/api/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Login failed"
  );
};

export const updateProfileRequest = async (payload) => {
  const token = localStorage.getItem("ccp_token");

  return requestJson(
    `${API_BASE_URL}/api/auth/profile`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Profile update failed"
  );
};

export const getProfileRequest = async () => {
  const token = localStorage.getItem("ccp_token");

  return requestJson(
    `${API_BASE_URL}/api/auth/profile`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    "Failed to fetch profile"
  );
};
