import { FlagImg } from '../lib/flags'

export default function PitchView({
  slots, phase, compatibleSlotIds = [], swapSlotIds = [], assignedSlotId,
  onPlacePlayer, onSwap,
  canMove = false, movingSlotId = null, moveTargetIds = [], swapMoveTargetIds = [], onSelectForMove, onMoveTo,
  onPlayerClick,
}) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden h-full w-auto max-w-full lg:h-auto lg:w-full lg:max-w-[480px]"
      style={{
        aspectRatio: '2/3',
        background: 'linear-gradient(180deg, #166534 0%, #15803d 40%, #16a34a 60%, #15803d 100%)',
        boxShadow: '0 0 60px rgba(0,0,0,0.5)',
      }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 150" preserveAspectRatio="none">
        <rect x="5" y="5" width="90" height="140" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
        <line x1="5" y1="75" x2="95" y2="75" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
        <circle cx="50" cy="75" r="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <circle cx="50" cy="75" r="0.8" fill="rgba(255,255,255,0.3)" />
        <rect x="30" y="5" width="40" height="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <rect x="30" y="130" width="40" height="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
      </svg>

      {slots.map(slot => (
        <PlayerCard
          key={slot.id}
          slot={slot}
          phase={phase}
          compatible={compatibleSlotIds.includes(slot.id)}
          assigned={assignedSlotId === slot.id}
          onPlace={onPlacePlayer}
          onSwap={onSwap}
          swapTarget={phase === 'placing' && swapSlotIds.includes(slot.id)}
          canMove={canMove}
          movingSlotId={movingSlotId}
          moveTarget={moveTargetIds.includes(slot.id)}
          swapMoveTarget={swapMoveTargetIds.includes(slot.id)}
          onSelectForMove={onSelectForMove}
          onMoveTo={onMoveTo}
          onPlayerClick={onPlayerClick}
        />
      ))}
    </div>
  )
}

function PlayerCard({
  slot, phase, compatible, assigned, onPlace, onSwap, swapTarget,
  canMove, movingSlotId, moveTarget, swapMoveTarget, onSelectForMove, onMoveTo, onPlayerClick,
}) {
  const left = `${slot.x}%`
  const top = `${slot.y}%`
  const isPlacing = phase === 'placing'
  const isIdle = phase === 'idle'
  const moving = movingSlotId != null

  if (!slot.player) {
    const placeable = isPlacing && compatible
    const moveable = isIdle && moving && moveTarget
    const clickable = placeable || moveable
    const dimmed = (isPlacing && !compatible) || (isIdle && moving && !moveTarget)
    const label = placeable ? 'Place here' : 'Move here'

    return (
      <button
        onClick={() => { if (placeable) onPlace?.(slot.id); else if (moveable) onMoveTo?.(slot.id) }}
        disabled={!clickable}
        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 transition-all duration-150"
        style={{ left, top, cursor: clickable ? 'pointer' : 'default' }}
      >
        <div
          className={`rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
            clickable
              ? 'w-12 h-12 border-yellow-400 bg-yellow-400/25 shadow-lg shadow-yellow-400/50 scale-110 animate-pulse'
              : assigned
                ? 'w-12 h-12 border-red-500 bg-red-500/20 shadow-lg shadow-red-500/40 scale-110'
                : dimmed
                  ? 'w-10 h-10 border-dashed border-white/15 bg-black/10 opacity-40'
                  : 'w-10 h-10 border-dashed border-white/40 bg-black/20'
          }`}
        >
          <span className={`text-[10px] font-extrabold tracking-tight ${
            clickable ? 'text-yellow-400' : assigned ? 'text-red-400' : 'text-white/50'
          }`}>
            {slot.position}
          </span>
        </div>
        {clickable && (
          <div className="bg-yellow-400 rounded px-1.5 py-0.5 shadow-md">
            <span className="text-gray-900 text-[8px] font-extrabold uppercase tracking-wider">{label}</span>
          </div>
        )}
        {assigned && !clickable && (
          <div className="bg-red-500 rounded px-1.5 py-0.5 shadow-md">
            <span className="text-white text-[8px] font-extrabold uppercase tracking-wider">Next</span>
          </div>
        )}
      </button>
    )
  }

  const isSwap = isPlacing && swapTarget
  const isMovingSelf = isIdle && slot.id === movingSlotId
  const selectableForMove = isIdle && canMove && !moving
  // Another placed player the picked-up player can swap with (idle move).
  const isSwapMoveTarget = isIdle && moving && !isMovingSelf && swapMoveTarget
  const dimmedFilled = (isPlacing && !swapTarget) || (isIdle && moving && !isMovingSelf && !swapMoveTarget)
  const viewable = !phase && !moving && Boolean(onPlayerClick)
  const clickable = isSwap || isMovingSelf || selectableForMove || isSwapMoveTarget || viewable

  function handleClick() {
    if (isSwap) onSwap?.(slot.id)
    else if (isSwapMoveTarget) onMoveTo?.(slot.id)
    else if (isMovingSelf || selectableForMove) onSelectForMove?.(slot.id)
    else if (!phase && !moving && onPlayerClick) onPlayerClick?.(slot.player)
  }

  return (
    <button
      onClick={handleClick}
      disabled={!clickable}
      className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 group"
      style={{ left, top, cursor: clickable ? 'pointer' : 'default' }}
      title={
        isSwap ? 'Swap in — moves this player to another position they play'
          : isSwapMoveTarget ? 'Tap to swap these two players'
            : isMovingSelf ? 'Tap to cancel'
              : selectableForMove ? 'Move to an open position (free)'
                : undefined
      }
    >
      <div className={`relative w-11 h-11 rounded-full overflow-hidden border-2 shadow-lg bg-gray-800 transition-all ${
        isSwap || isSwapMoveTarget
          ? 'border-cyan-400 ring-2 ring-cyan-400/60 scale-110 animate-pulse'
          : isMovingSelf
            ? 'border-yellow-400 ring-2 ring-yellow-400/60 scale-110 animate-pulse'
            : dimmedFilled
              ? 'border-white/40 opacity-40'
              : selectableForMove
                ? 'border-white group-hover:border-yellow-400 group-hover:scale-105'
                : 'border-white'
      }`}>
        <FlagImg nation={slot.player.nation} className="w-full h-full object-cover" />
        {(isSwap || isSwapMoveTarget) && (
          <span className="absolute inset-0 flex items-center justify-center bg-cyan-500/40 text-white text-base font-bold">⇄</span>
        )}
        {isMovingSelf && (
          <span className="absolute inset-0 flex items-center justify-center bg-yellow-500/40 text-white text-base font-bold">⤴</span>
        )}
        {selectableForMove && (
          <span className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-yellow-500/60 text-white text-base font-bold">⤴</span>
        )}
      </div>
      <div className="bg-black/70 rounded px-1.5 py-0.5 text-center max-w-[72px]">
        <div className="text-white text-[10px] font-bold leading-tight truncate">
          {slot.player.name.split(' ').pop()}
        </div>
        <div className="text-yellow-400 text-[10px] font-bold">{slot.player.overall}</div>
      </div>
      {isMovingSelf && (
        <div className="bg-yellow-400 rounded px-1.5 py-0.5 shadow-md">
          <span className="text-gray-900 text-[8px] font-extrabold uppercase tracking-wider">Moving</span>
        </div>
      )}
    </button>
  )
}
