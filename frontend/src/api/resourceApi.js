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
    throw createApiError("Cannot connect to backend API. Make sure backend server is running.", 0);
  }

  const data = await parseResponseData(response);

  if (!response.ok) {
    const isHtml = typeof data?.raw === "string" && data.raw.includes("<!DOCTYPE");

    const message = data?.message ||
      (isHtml && response.status === 404
        ? "Resource endpoint not found"
        : isHtml
          ? "Backend API URL is incorrect or backend is not reachable."
          : fallbackErrorMessage);

    throw createApiError(message, response.status, data);
  }

  if (data && typeof data === "object" && "raw" in data) {
    throw createApiError("Expected JSON from API but received HTML/text.", response.status, data);
  }

  return data;
};

export const listResourcesRequest = async (filters) => {
  const query = new URLSearchParams();

  if (filters.search) {
    query.set("search", filters.search);
  }

  if (filters.type) {
    query.set("type", filters.type);
  }

  if (filters.category) {
    query.set("category", filters.category);
  }

  if (filters.sortBy) {
    query.set("sortBy", filters.sortBy);
  }

  return requestJson(
    `${API_BASE_URL}/api/resources?${query.toString()}`,
    {
      method: "GET",
    },
    "Failed to load resources"
  );
};

export const createResourceRequest = async (payload) => {
  const token = localStorage.getItem("ccp_token");

  return requestJson(
    `${API_BASE_URL}/api/resources`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create resource"
  );
};

export const deleteResourceRequest = async (resourceId) => {
  const token = localStorage.getItem("ccp_token");

  return requestJson(
    `${API_BASE_URL}/api/resources/${resourceId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    "Failed to delete resource"
  );
};
