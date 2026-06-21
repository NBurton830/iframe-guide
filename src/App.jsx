import { useEffect, useRef, useState } from 'react'
import { SEED } from './lib/seed.js'
import { parseBatch, fetchTitle } from './lib/youtube.js'
import VideoCard from './components/VideoCard.jsx'
import TheaterModal from './components/TheaterModal.jsx'
import AddBatch from './components/AddBatch.jsx'
import { apiGet, apiSave } from './lib/api.js'

const STORAGE_KEY = 'kids-video-portal:v1'

// Full static class strings per accent so Tailwind's scanner keeps them.
const ACCENTS = {
  pink: {
    tabActive: 'bg-pink-500 text-white shadow-lg shadow-pink-300/50',
    chip: 'bg-pink-100 text-pink-700',
    glow: 'from-pink-200 via-rose-100 to-white',
    btn: 'bg-pink-500 hover:bg-pink-600',
  },
  violet: {
    tabActive: 'bg-violet-500 text-white shadow-lg shadow-violet-300/50',
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
  const [playing, setPlaying] = useState(null) // video record or null
  const [flash, setFlash] = useState('')
  const [cloudOk, setCloudOk] = useState(null) // null=unknown, true=syncing, false=local-only
  const flashTimer = useRef(null)
  const inFlight = useRef(new Set()) // video IDs whose title fetch is running
  const hydrated = useRef(false) // true once we've loaded the canonical library
  const saveTimer = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state

  function persistToServer(data) {
    apiSave(data)
      .then((res) => setCloudOk(res.ok)) // 204 ok; 500 => not syncing
      .catch(() => setCloudOk(false)) // offline / no API
  }

  // Load the canonical library from the server on mount. Disk file (local) or
  // Vercel Blob (deployed) — both survive browser-cache clears. The grid shows
  // the cached localStorage copy immediately; this patches it in the background.
  useEffect(() => {
    apiGet()
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          if (data && Array.isArray(data.children) && data.children.length) {
            setState(data)
          }
          setCloudOk(true)
        } else if (res.status === 404) {
          setCloudOk(true)
          persistToServer(stateRef.current) // materialize: nothing saved yet
        } else {
          setCloudOk(false) // reachable server, broken store
        }
      })
      .catch(() => setCloudOk(false)) // network / offline
      .finally(() => {
        hydrated.current = true
      })
  }, [])

  // Persist on every change: localStorage immediately (cache), server debounced.
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

  function handleRemove(videoId) {
    setState((prev) => ({
      ...prev,
      children: prev.children.map((c) =>
        c.id === active.id ? { ...c, videos: c.videos.filter((v) => v.id !== videoId) } : c,
      ),
    }))
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

        {/* Cloud sync warning — only when a save/load to the server failed */}
        {cloudOk === false && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800">
            ⚠ Not syncing to the cloud — changes are saved on this device only.
            <span className="font-normal">
              {' '}Check that the Vercel Blob store is connected and redeploy.
            </span>
          </div>
        )}

        {/* Child tabs */}
        <nav className="mt-8 flex justify-center gap-3" aria-label="Children">
          {state.children.map((c) => {
            const a = ACCENTS[c.accent] ?? ACCENTS.pink
            const isActive = c.id === active.id
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
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

        {/* Add videos */}
        <div className="mt-8 flex justify-center sm:justify-end">
          <AddBatch accent={accent} childName={active.name} onAdd={handleAddBatch} />
        </div>

        {flash && (
          <div className="mt-4 rounded-xl bg-white/80 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 shadow-sm">
            {flash}
          </div>
        )}

        {/* Grid */}
        {active.videos.length === 0 ? (
          <EmptyState childName={active.name} />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {active.videos.map((v) => (
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
      </div>

      {playing && <TheaterModal video={playing} onClose={() => setPlaying(null)} />}
    </div>
  )
}

function EmptyState({ childName }) {
  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <div className="text-6xl">🎬</div>
      <h2 className="text-xl font-bold text-slate-700">{childName}'s library is empty</h2>
      <p className="max-w-sm text-sm text-slate-500">
        Paste a list of YouTube links using “Add videos” to fill this shelf.
      </p>
    </div>
  )
}
