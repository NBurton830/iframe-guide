import { useState } from 'react'

// Collapsible paste box: drop in a list of YouTube URLs, append to the library.
export default function AddBatch({ accent, childName, onAdd }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  function submit() {
    if (!text.trim()) return
    onAdd(text)
    setText('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full rounded-2xl px-5 py-3 text-base font-bold text-white shadow-sm transition sm:w-auto ${accent.btn}`}
      >
        ＋ Add videos
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-[min(90vw,28rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Paste YouTube links for {childName}
          </label>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={'https://www.youtube.com/watch?v=...\nhttps://youtu.be/...'}
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
          />
          <p className="mt-1 text-xs text-slate-400">
            One per line or space-separated. Duplicates are skipped automatically.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${accent.btn}`}
            >
              Add to library
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
