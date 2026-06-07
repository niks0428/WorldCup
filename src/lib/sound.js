const KEY = 'ltt_muted'

let ctx = null
function getCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)() }
    catch { return null }
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function isMuted() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}
export function setMuted(v) {
  try { localStorage.setItem(KEY, v ? '1' : '0') } catch {}
}
export function toggleMuted() {
  const next = !isMuted()
  setMuted(next)
  return next
}

function tone(freq, start, dur, { type = 'sine', gain = 0.15, sweepTo } = {}) {
  const ac = getCtx()
  if (!ac) return
  const t0 = ac.currentTime + start
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g); g.connect(ac.destination)
  osc.start(t0); osc.stop(t0 + dur + 0.02)
}

// Short tick used during the spin reel
export function playTick() {
  if (isMuted()) return
  tone(880, 0, 0.04, { type: 'square', gain: 0.05 })
}

// Satisfying "thunk" when a player is placed
export function playPlace() {
  if (isMuted()) return
  tone(420, 0, 0.12, { type: 'triangle', gain: 0.18, sweepTo: 180 })
}

// Soft click when picking a player from the list
export function playPick() {
  if (isMuted()) return
  tone(660, 0, 0.06, { type: 'sine', gain: 0.1 })
}

// Spin start whoosh
export function playSpin() {
  if (isMuted()) return
  tone(220, 0, 0.5, { type: 'sawtooth', gain: 0.08, sweepTo: 660 })
}

// Result fanfare — scaled to how good the result is
export function playResult(score) {
  if (isMuted()) return
  if (score >= 90) {
    // Triumphant ascending arpeggio
    const notes = [523, 659, 784, 1047, 1319]
    notes.forEach((f, i) => tone(f, i * 0.12, 0.5, { type: 'triangle', gain: 0.2 }))
  } else if (score >= 74) {
    const notes = [392, 523, 659]
    notes.forEach((f, i) => tone(f, i * 0.13, 0.4, { type: 'triangle', gain: 0.18 }))
  } else if (score >= 58) {
    tone(392, 0, 0.3, { type: 'triangle', gain: 0.15 })
    tone(523, 0.14, 0.35, { type: 'triangle', gain: 0.15 })
  } else {
    // Sad descending
    tone(330, 0, 0.3, { type: 'sine', gain: 0.14, sweepTo: 220 })
    tone(247, 0.25, 0.4, { type: 'sine', gain: 0.14, sweepTo: 165 })
  }
}
