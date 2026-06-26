import { useState } from 'react'

// Parent-only panel (password "zoom") to toggle the kid lock on/off.
// When ON, the player is sandboxed so kids can't click out to youtube.com.
// When OFF, a grown-up can sign in / watch on YouTube.
const PASSWORD = 'zoom'

export default function LockPanel({ locked, onChange }) {
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [authed, setAuthed] = useState(false)
  const [err, setErr] = useState('')

  function close() {
    setOpen(false)
    setPw('')
    setAuthed(false)
    setErr('')
  }

  function submit(e) {
    e.preventDefault()
    if (pw === PASSWORD) {
      setAuthed(true)
      setErr('')
    } else {
      setErr('Incorrect password.')
    }
  }

  return (
    <>
      {/* Subtle lock button in the top-right corner */}
      <button
        onClick={() => setOpen(true)}
        title="Parent controls"
        aria-label="Parent controls"
        className="fixed right-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-lg shadow-sm transition hover:bg-white"
      >
        {locked ? '🔒' : '🔓'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {!authed ? (
              <form onSubmit={submit}>
                <div className="text-4xl">🔐</div>
                <h2 className="mt-2 text-xl font-black text-slate-800">Parent controls</h2>
                <p className="mt-1 text-sm text-slate-500">Enter the parent password.</p>
                <input
                  type="password"
                  autoFocus
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Password"
                  className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-slate-700 outline-none focus:ring-2 focus:ring-violet-400"
                />
                {err && <p className="mt-2 text-sm font-semibold text-rose-500">{err}</p>}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl bg-violet-500 py-2.5 text-sm font-bold text-white hover:bg-violet-600"
                  >
                    Unlock
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="text-4xl">{locked ? '🔒' : '🔓'}</div>
                <h2 className="mt-2 text-xl font-black text-slate-800">Parent controls</h2>

                <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left">
                  <div>
                    <div className="font-bold text-slate-800">Kid lock</div>
                    <div className="text-xs text-slate-500">Block leaving to YouTube</div>
                  </div>
                  <button
                    role="switch"
                    aria-checked={locked}
                    onClick={() => onChange(!locked)}
                    className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                      locked ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                        locked ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  {locked
                    ? 'ON — kids can’t click out to YouTube.'
                    : 'OFF — videos play normally and you can sign in / watch on YouTube. Turn back ON when done.'}
                </p>

                <button
                  onClick={close}
                  className="mt-5 w-full rounded-2xl bg-slate-800 py-2.5 text-sm font-bold text-white hover:bg-slate-900"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
