const BASE_URL = process.env.REACT_APP_API_URL;
const getToken = () => localStorage.getItem('token');

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

// ── Auth ──────────────────────────────────────────────
export const registerUser = async (name, email, password) => {
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) throw await res.json();
  return res.json();
};

export const loginUser = async (email, password) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await res.json();
  const data = await res.json();
  localStorage.setItem('token', data.access_token); // store JWT
  return data;
};

export const logoutUser = () => localStorage.removeItem('token');

// ── Chats ─────────────────────────────────────────────
export const uploadPDF = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) throw await res.json();
  return res.json(); // returns { id, name, pdf_path, user_id }
};

export const fetchHistory = async () => {
  const res = await fetch(`${BASE_URL}/history`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw await res.json();
  return res.json(); // now returns { chats, username }
};

// ── Messages ──────────────────────────────────────────
export const fetchMessages = async (chatId) => {
  const res = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw await res.json();
  return res.json(); // returns { pdf_path, messages: [{role, message}] }
};

export const sendMessage = async (chatId, content) => {
  const res = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw await res.json();
  return res.json(); // returns { response }
};

export const deleteChat = async (chatId) => {
  const res = await fetch(`${BASE_URL}/delete_chat?chat_id=${chatId}`, {  // ← fix
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw await res.json();
  return res.json();
};

export const deleteAllChats = async () => {
  const res = await fetch(`${BASE_URL}/delete_all_chat`, {  // ← fix
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw await res.json();
  return res.json();
};

// ← new
export const deleteAccount = async () => {
  const res = await fetch(`${BASE_URL}/delete_account`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json(); // read once
  if (!res.ok) throw data;
  return data;
};

export const renameChat = async (chatId, name) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}/chats/${chatId}/rename`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name}),
  });
  if (!res.ok) throw await res.json();
  return res.json();
};

export const analyzeDocument = async (chatId) => {
  const res = await fetch(`${BASE_URL}/chats/${chatId}/analyze`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw await res.json();
  return res.json();
};

export const getAnalysis = async (chatId) => {
  const res = await fetch(`${BASE_URL}/chats/${chatId}/analyze`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw await res.json();
  return res.json();
};