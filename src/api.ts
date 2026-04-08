const API = 'http://localhost:3001/api';

function getToken(): string | null {
  return localStorage.getItem('revcode_token');
}

export function setToken(token: string) {
  localStorage.setItem('revcode_token', token);
}

export function clearToken() {
  localStorage.removeItem('revcode_token');
  localStorage.removeItem('revcode_user');
}

export function setUser(user: any) {
  localStorage.setItem('revcode_user', JSON.stringify(user));
}

export function getUser(): any {
  try {
    const u = localStorage.getItem('revcode_user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: any = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Auth
export async function loginOAuth(provider: string) {
  const data = await request('/auth/oauth', {
    method: 'POST',
    body: JSON.stringify({ provider, username: 'PUNITH HU', email: 'punith@revcode.ai' }),
  });
  setToken(data.token);
  setUser(data.user);
  return data;
}

export async function loginEmail(email: string, password: string) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  setUser(data.user);
  return data;
}

export async function registerUser(username: string, email: string, password: string) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  setToken(data.token);
  setUser(data.user);
  return data;
}

export async function getMe() {
  return request('/auth/me');
}

// Repositories
export async function getRepositories() {
  return request('/repositories');
}

export async function createRepository(name: string, language: string, visibility: string, description: string) {
  return request('/repositories', {
    method: 'POST',
    body: JSON.stringify({ name, language, visibility, description }),
  });
}

export async function deleteRepository(id: string) {
  return request(`/repositories/${id}`, { method: 'DELETE' });
}

// Pull Requests
export async function getPullRequests(owner: string, repo: string) {
  return request(`/repositories/${owner}/${repo}/pulls`);
}

export async function getPullRequestDetail(owner: string, repo: string, pullNumber: number) {
  return request(`/repositories/${owner}/${repo}/pulls/${pullNumber}`);
}


// Reviews
export async function submitReview(code: string, filename?: string, repositoryId?: string) {
  return request('/review', {
    method: 'POST',
    body: JSON.stringify({ code, filename, repositoryId }),
  });
}

export async function getReviews() {
  return request('/reviews');
}

// Cloud Security
export async function runCloudScan(repositoryId: string) {
  return request('/cloud/scan', {
    method: 'POST',
    body: JSON.stringify({ repositoryId }),
  });
}

export async function getCloudScans() {
  return request('/cloud/scans');
}

// Stats
export async function getStats() {
  return request('/stats');
}
