// Single source of truth for turning pasted YouTube URLs into safe embed records.

// Extract the 11-character video ID from any common YouTube URL shape:
//   watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID, /live/ID
// Returns null if no valid ID is found.
export function extractVideoId(rawUrl) {
  if (!rawUrl) return null
  const url = rawUrl.trim()

  // Bare 11-char ID pasted on its own.
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url

  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,        // watch?v=ID
    /youtu\.be\/([A-Za-z0-9_-]{11})/,   // youtu.be/ID
    /\/embed\/([A-Za-z0-9_-]{11})/,     // /embed/ID
    /\/shorts\/([A-Za-z0-9_-]{11})/,    // /shorts/ID
    /\/live\/([A-Za-z0-9_-]{11})/,      // /live/ID
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  return null
}

// Decode the ?pp= search-context param some URLs carry — it base64-encodes a
// little protobuf whose payload is the search query that surfaced the video.
// Used only as a friendly default title; failures fall back silently.
export function titleHintFromUrl(rawUrl) {
  try {
    const m = rawUrl.match(/[?&]pp=([^&]+)/)
    if (!m) return null
    let b64 = decodeURIComponent(m[1]).replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4) b64 += '='
    const bytes = atob(b64)
    // Pull the longest run of printable ASCII out of the protobuf blob.
    const runs = bytes.match(/[ -~]{4,}/g)
    if (!runs) return null
    const best = runs.sort((a, b) => b.length - a.length)[0].trim()
    if (!best) return null
    return best.charAt(0).toUpperCase() + best.slice(1)
  } catch {
    return null
  }
}

// Fetch the real video title via YouTube's public oEmbed endpoint — no API key,
// and it reflects the request Origin so it's CORS-safe from the browser.
// Throws for private/deleted videos (4xx); callers keep their placeholder.
export async function fetchTitle(videoId) {
  const endpoint =
    'https://www.youtube.com/oembed?format=json&url=' +
    encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)
  const res = await fetch(endpoint)
  if (!res.ok) throw new Error(`oembed ${res.status}`)
  const data = await res.json()
  if (!data.title) throw new Error('oembed: no title')
  return data.title // res.json() already decodes JSON escapes
}

// Privacy-enhanced embed URL. rel=0 keeps related videos limited to the same
// channel and the -nocookie host avoids tracking cookies until playback.
export function embedUrl(videoId) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
}

// Thumbnail straight from YouTube's image CDN — fine for a static placeholder,
// no embed/cookie involved. Falls back through resolutions via onError.
export function thumbUrl(videoId, quality = 'hqdefault') {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`
}

// Parse a pasted blob (newline- or space-separated) into deduped video records.
// `existingIds` lets the caller skip videos already in that child's library.
export function parseBatch(text, existingIds = new Set()) {
  const tokens = text.split(/\s+/).filter(Boolean)
  const seen = new Set(existingIds)
  const out = []
  for (const token of tokens) {
    const id = extractVideoId(token)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      title: titleHintFromUrl(token) || `Video ${id}`,
      addedAt: Date.now(),
    })
  }
  return out
}
