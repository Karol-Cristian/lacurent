const API_BASE = "https://lacurent.lemnarukarol.workers.dev";
const AUTH_TOKEN_KEY = "lacurent_auth_token";
const AUTH_USER_KEY = "lacurent_user";

function token() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "null");
  } catch {
    return null;
  }
}

function saveAuth(data) {
  localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
}

function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

async function api(path, body = null) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (token()) {
    headers.Authorization = `Bearer ${token()}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : "{}"
  });
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || "Cererea a eșuat.");
  }

  return result;
}

window.LaCurentAuth = {
  api,
  clearAuth,
  currentUser,
  saveAuth,
  token
};
