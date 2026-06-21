// Thin client for the /api/library persistence endpoint. Carries the portal
// password (when set) so the same code works locally (no password) and on a
// deployed, password-protected Vercel build.
const PW_KEY = 'kids-video-portal:pw'

let password = ''
try {
  password = localStorage.getItem(PW_KEY) || ''
} catch {
  /* storage unavailable */
}

export function getPassword() {
  return password
}

export function setPassword(pw) {
  password = pw || ''
  try {
    if (password) localStorage.setItem(PW_KEY, password)
    else localStorage.removeItem(PW_KEY)
  } catch {
    /* ignore */
  }
}

function authHeaders(extra) {
  return {
    ...(extra || {}),
    ...(password ? { 'x-portal-password': password } : {}),
  }
}

export function apiGet() {
  return fetch('/api/library', { headers: authHeaders() })
}

export function apiSave(data) {
  return fetch('/api/library', {
    method: 'POST',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(data),
  })
}
