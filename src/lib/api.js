// Thin client for the /api/library persistence endpoint.
export function apiGet() {
  return fetch('/api/library')
}

export function apiSave(data) {
  return fetch('/api/library', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  })
}
