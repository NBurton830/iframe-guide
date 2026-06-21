import { useState } from 'react'
import { thumbUrl } from '../lib/youtube.js'

// A single clickable video tile: thumbnail placeholder + title + play overlay.
export default function VideoCard({ video, accent, onPlay, onRemove }) {
  const [broken, setBroken] = useState(false)

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
      <button
        onClick={onPlay}
        className="block w-full text-left focus:outline-none"
        aria-label={`Play ${video.title}`}
      >
        <div className="relative aspect-video overflow-hidden bg-slate-100">
          {broken ? (
            <div className="flex h-full w-full items-center justify-center text-5xl">🎥</div>
          ) : (
            <img
              src={thumbUrl(video.id)}
              alt={video.title}
              loading="lazy"
              onError={() => setBroken(true)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
            <span className="flex h-14 w-14 translate-y-2 items-center justify-center rounded-full bg-white/90 text-2xl text-slate-800 opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100">
              ▶
            </span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-base font-bold leading-tight text-slate-800">
            {video.title}
          </h3>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${accent.chip}`}>
            Tap to watch
          </span>
        </div>
      </button>

      {/* Remove button — hidden until hover so kids don't fat-finger it */}
      <button
        onClick={onRemove}
        title="Remove video"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 opacity-0 shadow transition hover:bg-rose-500 hover:text-white group-hover:opacity-100"
      >
        ✕
      </button>
    </div>
  )
}
