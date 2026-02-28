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

/* ── Post endpoints ── */

export const listPostsRequest = async (query = {}) => {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.category && query.category !== "all") params.set("category", query.category);
  return requestJson(`${API_BASE_URL}/api/community/posts?${params.toString()}`, { headers: authHeaders() }, "Could not load posts");
};

export const getPostRequest = async (postId) => {
  return requestJson(`${API_BASE_URL}/api/community/posts/${postId}`, { headers: authHeaders() }, "Could not load post");
};

export const createPostRequest = async (payload) => {
  return requestJson(
    `${API_BASE_URL}/api/community/posts`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) },
    "Could not create post"
  );
};

export const likePostRequest = async (postId) => {
  return requestJson(
    `${API_BASE_URL}/api/community/posts/${postId}/like`,
    { method: "PATCH", headers: authHeaders() },
    "Could not like post"
  );
};

export const deletePostRequest = async (postId) => {
  return requestJson(
    `${API_BASE_URL}/api/community/posts/${postId}`,
    { method: "DELETE", headers: authHeaders() },
    "Could not delete post"
  );
};

/* ── Reply endpoints ── */

export const listRepliesRequest = async (postId) => {
  return requestJson(`${API_BASE_URL}/api/community/replies/${postId}`, { headers: authHeaders() }, "Could not load replies");
};

export const createReplyRequest = async (postId, payload) => {
  return requestJson(
    `${API_BASE_URL}/api/community/replies/${postId}`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) },
    "Could not add reply"
  );
};

export const likeReplyRequest = async (replyId) => {
  return requestJson(
    `${API_BASE_URL}/api/community/replies/${replyId}/like`,
    { method: "PATCH", headers: authHeaders() },
    "Could not like reply"
  );
};

export const deleteReplyRequest = async (replyId) => {
  return requestJson(
    `${API_BASE_URL}/api/community/replies/${replyId}`,
    { method: "DELETE", headers: authHeaders() },
    "Could not delete reply"
  );
};
