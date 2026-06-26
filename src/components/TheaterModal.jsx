import { useEffect } from 'react'
import { embedUrl } from '../lib/youtube.js'

// Full-focus overlay player. Uses the privacy-enhanced youtube-nocookie embed.
// When `locked` (kid mode) the iframe is sandboxed so clicks can't navigate out
// to youtube.com; unlocked (parent mode) the player behaves normally.
export default function TheaterModal({ video, onClose, locked = true }) {
  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <h2 className="truncate text-lg font-bold text-white">{video.title}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl text-white transition hover:bg-white/25"
            aria-label="Close player"
          >
            ✕
          </button>
        </div>
        <div className="aspect-video w-full bg-black">
          {/* Locked: sandbox WITHOUT allow-popups/allow-top-navigation* blocks the
              logo/title/"Watch on YouTube" click-outs. Unlocked: no sandbox, so a
              parent can click through to sign in / watch on YouTube. */}
          <iframe
            key={`${video.id}-${locked}`}
            className="h-full w-full"
            src={embedUrl(video.id, locked)}
            title={video.title}
            sandbox={locked ? 'allow-scripts allow-same-origin allow-presentation' : undefined}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}
