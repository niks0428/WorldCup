// Renders a shareable result card to a PNG blob using canvas.
// No external assets — pure canvas drawing.

function statColor(v) {
  if (v > 80) return '#4ade80'
  if (v <= 50) return '#ef4444'
  return '#facc15'
}

export async function buildShareImage({ slots, formation, mode, score, tier, groups }) {
  const W = 1080, H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0b1220')
  bg.addColorStop(1, '#111827')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Pitch panel
  const pitch = ctx.createLinearGradient(0, 180, 0, 760)
  pitch.addColorStop(0, '#166534')
  pitch.addColorStop(1, '#15803d')
  roundRect(ctx, 90, 200, W - 180, 560, 32)
  ctx.fillStyle = pitch
  ctx.fill()
  // halfway line + circle
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(90, 480); ctx.lineTo(W - 90, 480); ctx.stroke()
  ctx.beginPath(); ctx.arc(W / 2, 480, 70, 0, Math.PI * 2); ctx.stroke()

  // Header
  ctx.textAlign = 'center'
  ctx.fillStyle = '#facc15'
  ctx.font = '700 40px system-ui, sans-serif'
  ctx.fillText('🏆 LIFT THE TROPHY', W / 2, 90)
  ctx.fillStyle = '#9ca3af'
  ctx.font = '500 30px system-ui, sans-serif'
  const modeLabel = { classic: 'Classic', expert: 'Expert', hardcore: 'Hardcore', daily: 'Daily Challenge' }[mode] || mode
  ctx.fillText(`${formation} · ${modeLabel}`, W / 2, 145)

  // Players on the pitch (dots with name + rating)
  const players = slots.filter(s => s.player)
  const px = (x) => 90 + (x / 100) * (W - 180)
  const py = (y) => 200 + (y / 100) * 560
  for (const s of players) {
    const cx = px(s.x), cy = py(s.y)
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2)
    ctx.fillStyle = '#facc15'; ctx.fill()
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke()
    ctx.fillStyle = '#111827'
    ctx.font = '700 22px system-ui, sans-serif'
    ctx.fillText(String(s.player.overall), cx, cy + 8)
    // name below
    ctx.fillStyle = '#fff'
    ctx.font = '600 19px system-ui, sans-serif'
    const last = s.player.name.split(' ').pop()
    ctx.fillText(last, cx, cy + 52)
  }

  // Result tier
  ctx.fillStyle = '#fff'
  ctx.font = '800 76px system-ui, sans-serif'
  ctx.fillText(`${tier.emoji} ${tier.label}`, W / 2, 850)

  // Score
  ctx.fillStyle = '#facc15'
  ctx.font = '800 120px system-ui, sans-serif'
  ctx.fillText(String(score), W / 2, 980)
  ctx.fillStyle = '#9ca3af'
  ctx.font = '600 28px system-ui, sans-serif'
  ctx.fillText('TEAM SCORE', W / 2, 1020)

  // Group mini-bars (GK DEF MID ATT) along the bottom
  const order = [['GK', groups.GK], ['DEF', groups.DEF], ['MID', groups.MID], ['ATT', groups.ATT]]
  const bw = 180, gap = 30
  const totalW = order.length * bw + (order.length - 1) * gap
  let bx = (W - totalW) / 2
  for (const [label, val] of order) {
    ctx.fillStyle = '#1f2937'
    roundRect(ctx, bx, 1045, bw, 14, 7); ctx.fill()
    if (val != null) {
      ctx.fillStyle = statColor(val)
      roundRect(ctx, bx, 1045, bw * (val / 99), 14, 7); ctx.fill()
    }
    bx += bw + gap
  }

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
