import { useEffect, useMemo, useRef, useState } from 'react'
import { SEED } from './lib/seed.js'
import { parseBatch, fetchTitle } from './lib/youtube.js'
import VideoCard from './components/VideoCard.jsx'
import TheaterModal from './components/TheaterModal.jsx'
import AddBatch from './components/AddBatch.jsx'
import { apiGet, apiSave, setPassword } from './lib/api.js'

const STORAGE_KEY = 'kids-video-portal:v1'

// Full static class strings per accent so Tailwind's scanner keeps them.
const ACCENTS = {
  pink: {
    tabActive: 'bg-pink-500 text-white shadow-lg shadow-pink-300/50',
    ring: 'focus:ring-pink-400',
    chip: 'bg-pink-100 text-pink-700',
    glow: 'from-pink-200 via-rose-100 to-white',
    btn: 'bg-pink-500 hover:bg-pink-600',
  },
  violet: {
    tabActive: 'bg-violet-500 text-white shadow-lg shadow-violet-300/50',
    ring: 'focus:ring-violet-400',
    chip: 'bg-violet-100 text-violet-700',
    glow: 'from-violet-200 via-indigo-100 to-white',
    btn: 'bg-violet-500 hover:bg-violet-600',
  },
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore corrupt storage */
  }
  return SEED
}

export default function App() {
  const [state, setState] = useState(loadState)
  const [activeId, setActiveId] = useState(state.children[0]?.id)
  const [query, setQuery] = useState('')
  const [playing, setPlaying] = useState(null) // video record or null
  const [flash, setFlash] = useState('')
  const [gate, setGate] = useState('checking') // 'checking' | 'locked' | 'open'
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const flashTimer = useRef(null)
  const fileInput = useRef(null)
  const inFlight = useRef(new Set()) // video IDs whose title fetch is running
  const hydrated = useRef(false) // true once we've loaded the canonical library
  const saveTimer = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state

  function persistToServer(data) {
    apiSave(data).catch(() => {
      /* offline / preview build without the API — localStorage still holds it */
    })
  }

  // Load the canonical library from the server. Disk file (local) or Vercel Blob
  // (deployed) — both survive browser-cache clears. 401 means the password gate
  // is on and we need credentials before showing anything.
  async function attemptLoad() {
    try {
      const res = await apiGet()
      if (res.status === 401) {
        setGate('locked')
        return 'locked'
      }
      if (res.ok) {
        const data = await res.json()
        if (data && Array.isArray(data.children) && data.children.length) {
          setState(data)
        }
        hydrated.current = true
        setGate('open')
        if (res.status === 404) persistToServer(stateRef.current) // materialize
        return 'open'
      }
    } catch {
      /* network/offline — fall through to cached localStorage state */
    }
    hydrated.current = true
    setGate('open')
    return 'open'
  }

  useEffect(() => {
    attemptLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submitPassword(e) {
    e.preventDefault()
    setPassword(pwInput.trim())
    setPwError('')
    const result = await attemptLoad()
    if (result === 'locked') setPwError('Incorrect password — try again.')
  }

  // Persist on every change: localStorage immediately (cache), disk file debounced.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    if (!hydrated.current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persistToServer(state), 400)
  }, [state])

  // Patch a single video record by id, wherever it lives.
  function patchVideo(childId, videoId, patch) {
    setState((prev) => ({
      ...prev,
      children: prev.children.map((c) =>
        c.id === childId
          ? { ...c, videos: c.videos.map((v) => (v.id === videoId ? { ...v, ...patch } : v)) }
          : c,
      ),
    }))
  }

  // Backfill real YouTube titles for any video not yet resolved. Runs whenever
  // the library changes, so freshly pasted videos get their names automatically.
  useEffect(() => {
    for (const child of state.children) {
      for (const v of child.videos) {
        if (v.titleResolved || inFlight.current.has(v.id)) continue
        inFlight.current.add(v.id)
        fetchTitle(v.id)
          .then((title) => patchVideo(child.id, v.id, { title, titleResolved: true }))
          .catch(() => patchVideo(child.id, v.id, { titleResolved: true })) // keep placeholder
          .finally(() => inFlight.current.delete(v.id))
      }
    }
  }, [state])

  const active = state.children.find((c) => c.id === activeId) ?? state.children[0]
  const accent = ACCENTS[active.accent] ?? ACCENTS.pink

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return active.videos
    return active.videos.filter(
      (v) => v.title.toLowerCase().includes(q) || v.id.toLowerCase().includes(q),
    )
  }, [active.videos, query])

  function showFlash(msg) {
    setFlash(msg)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(''), 3500)
  }

  // Append a pasted batch to the active child, skipping duplicates.
  function handleAddBatch(text) {
    const existing = new Set(active.videos.map((v) => v.id))
    const additions = parseBatch(text, existing)
    if (additions.length === 0) {
      showFlash('No new videos found in that paste (already added or invalid).')
      return
    }
    setState((prev) => ({
      ...prev,
      children: prev.children.map((c) =>
        c.id === active.id ? { ...c, videos: [...c.videos, ...additions] } : c,
      ),
    }))
    showFlash(`Added ${additions.length} video${additions.length > 1 ? 's' : ''} to ${active.name}.`)
  }

  // Download the whole library as a JSON file for off-machine backup.
  function handleExport() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kids-video-portal-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Restore a library from a previously exported backup file.
  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (!data || !Array.isArray(data.children)) throw new Error('bad file')
        setState(data)
        setActiveId(data.children[0]?.id)
        showFlash('Library imported and saved.')
      } catch {
        showFlash('That file was not a valid library backup.')
      }
    }
    reader.readAsText(file)
    e.target.value = '' // let the same file be re-imported later
  }

  function handleRemove(videoId) {
    setState((prev) => ({
      ...prev,
      children: prev.children.map((c) =>
        c.id === active.id ? { ...c, videos: c.videos.filter((v) => v.id !== videoId) } : c,
      ),
    }))
  }

  if (gate === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-pink-100 to-white">
        <div className="animate-pulse text-2xl font-bold text-slate-400">📺 Loading…</div>
      </div>
    )
  }

  if (gate === 'locked') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-pink-200 via-violet-100 to-white p-4">
        <form
          onSubmit={submitPassword}
          className="w-full max-w-sm rounded-3xl bg-white/90 p-8 text-center shadow-xl"
        >
          <div className="text-5xl">🔒</div>
          <h1 className="mt-3 text-2xl font-black text-slate-800">Kids Video Portal</h1>
          <p className="mt-1 text-sm text-slate-500">Enter the family password to continue.</p>
          <input
            type="password"
            autoFocus
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            placeholder="Password"
            className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-slate-700 outline-none focus:ring-2 focus:ring-violet-400"
          />
          {pwError && <p className="mt-2 text-sm font-semibold text-rose-500">{pwError}</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded-2xl bg-violet-500 py-3 text-base font-bold text-white shadow-sm transition hover:bg-violet-600"
          >
            Unlock
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${accent.glow} transition-colors duration-500`}>
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        {/* Header */}
        <header className="flex flex-col items-center gap-2 pt-10 text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-800 sm:text-5xl">
            <span className="mr-2">📺</span>Kids Video Portal
          </h1>
          <p className="text-sm font-medium text-slate-500">
            A safe, ad-light place to watch. Private embeds only — no recommendations leaking in.
          </p>
        </header>

        {/* Child tabs */}
        <nav className="mt-8 flex justify-center gap-3" aria-label="Children">
          {state.children.map((c) => {
            const a = ACCENTS[c.accent] ?? ACCENTS.pink
            const isActive = c.id === active.id
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveId(c.id)
                  setQuery('')
                }}
                className={`rounded-full px-6 py-2.5 text-base font-bold transition-all ${
                  isActive ? a.tabActive : 'bg-white/70 text-slate-600 hover:bg-white'
                }`}
              >
                <span className="mr-1.5">{c.emoji}</span>
                {c.name}
                <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                  {c.videos.length}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Search + add */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${active.name}'s videos…`}
              className={`w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-700 shadow-sm outline-none ring-0 transition focus:ring-2 ${accent.ring}`}
            />
          </div>
          <AddBatch accent={accent} childName={active.name} onAdd={handleAddBatch} />
        </div>

        {flash && (
          <div className="mt-4 rounded-xl bg-white/80 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 shadow-sm">
            {flash}
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyState query={query} childName={active.name} />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v) => (
              <VideoCard
                key={v.id}
                video={v}
                accent={accent}
                onPlay={() => setPlaying(v)}
                onRemove={() => handleRemove(v.id)}
              />
            ))}
          </div>
        )}

        {/* Backup controls */}
        <footer className="mt-14 flex flex-col items-center gap-3 border-t border-white/60 pt-6 text-center">
          <p className="text-xs font-medium text-slate-500">
            ✓ Saved to disk automatically — survives browser cache clears. Export for an off-machine backup.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-white"
            >
              ⬇ Export backup
            </button>
            <button
              onClick={() => fileInput.current?.click()}
              className="rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-white"
            >
              ⬆ Import backup
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </footer>
      </div>

      {playing && <TheaterModal video={playing} onClose={() => setPlaying(null)} />}
    </div>
  )
}

function EmptyState({ query, childName }) {
  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <div className="text-6xl">{query ? '🔎' : '🎬'}</div>
      <h2 className="text-xl font-bold text-slate-700">
        {query ? 'No matches' : `${childName}'s library is empty`}
      </h2>
      <p className="max-w-sm text-sm text-slate-500">
        {query
          ? 'Try a different search term, or clear the search box.'
          : 'Paste a list of YouTube links using “Add videos” to fill this shelf.'}
      </p>
    </div>
  )
}
