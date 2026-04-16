export interface Prompt {
  id: string;
  title: string;
  content: string;
  complexity: number;
  created_at: string;
  view_count: number;
  tags?: string[];
}

export interface PromptListResponse {
  id: string;
  title: string;
  complexity: number;
  created_at: string;
  tags?: string[];
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const login = async (username: string, password: string) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('username', data.username);
  return data;
};

export const register = async (username: string, password: string) => {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json();
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
};

export const getPrompts = async (tag?: string): Promise<PromptListResponse[]> => {
  const url = tag ? `/api/prompts?tag=${encodeURIComponent(tag)}` : '/api/prompts';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch prompts');
  return res.json();
};

export const getTags = async (): Promise<{ id: string, name: string }[]> => {
  const res = await fetch('/api/tags');
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
};

export const getPrompt = async (id: string): Promise<Prompt> => {
  const res = await fetch(`/api/prompts/${id}`);
  if (!res.ok) throw new Error('Failed to fetch prompt');
  return res.json();
};

export const createPrompt = async (data: { title: string; content: string; complexity: number; tags?: string[] }): Promise<{ id: string }> => {
  const res = await fetch('/api/prompts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create prompt');
  }
  return res.json();
};
