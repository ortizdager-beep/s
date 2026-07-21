const BASE_URL = "/api";

async function handleResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    const error = new Error((body && body.error) || `Error ${res.status}`);
    error.status = res.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return handleResponse(res);
}

async function upload(path, file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return handleResponse(res);
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  getEmployees: () => request("/employees"),
  submit: (rows) => request("/submit", { method: "POST", body: JSON.stringify({ rows }) }),
  uploadDataFile: (file) => upload("/admin/upload", file),
};
