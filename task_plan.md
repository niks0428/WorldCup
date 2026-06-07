# Task Plan — Lift the Trophy

## Goal
Build a fully playable browser-based football draft game (World Cup edition). Players spin to get a random nation + World Cup year, draft one player per round, build a World Cup XI over 11 rounds, then see a projected tournament result. Fully static, no backend, deployable to GitHub Pages or Vercel.

## Stack
- React + Vite
- Tailwind CSS
- useState / useReducer (no external state lib)
- Static JSON data (imported at build time)
- GitHub Pages or Vercel for hosting

## Phases

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 0 | Project scaffold (Vite + React + Tailwind) | `complete` | Deployed to gh-pages |
| 1 | Data layer — player JSON + formations JSON (2 tournaments: 2022, 2018) | `complete` | 16 nations, ~180 players |
| 2 | Scoring & compatibility utils (pure functions) | `complete` | |
| 3 | SetupScreen — mode + formation picker | `complete` | |
| 4 | DraftScreen — spin mechanic, squad filter, slot assignment | `complete` | |
| 5 | PitchView — SVG/div pitch with player slots | `complete` | |
| 6 | ResultScreen — score calc, tier display, share button | `complete` | |
| 7 | Polish — spin animation, responsive layout, remaining tournament data | `pending` | 2014/2010/2006/2002/1998/1994 data + spin anim |

## File Structure (target)
```
/lift-the-trophy/
  src/
    App.jsx
    components/
      SetupScreen.jsx
      DraftScreen.jsx
      PitchView.jsx
      ResultScreen.jsx
    data/
      players.json
      formations.json
    utils/
      scoring.js
      compatibility.js
  index.html
  vite.config.js
  tailwind.config.js
  task_plan.md
  findings.md
  progress.md
```

## Key Design Decisions
- Position fit multipliers: ideal=1.0, compatible=0.85, incompatible=0.6
- Score weights: GK 8%, DEF avg 28%, MID avg 32%, ATT avg 32%
- Spin: random nation+year pair, no repeats per session, ~1.2s CSS slot-reel animation
- Modes: Classic (broad squad) + Expert (squad filtered to named starting XI)
- Formations: 4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 5-3-2, 3-4-3, 4-5-1
- MVP scope: 8 tournaments, 16 nations — start with 2022 + 2018

## Tournament Result Tiers (to define in scoring.js)
| Team Score | Result |
|------------|--------|
| 90+ | 🏆 World Cup Winners |
| 80–89 | 🥈 Finalists |
| 70–79 | 🥉 Semi-finalists |
| 60–69 | 🎯 Quarter-finalists |
| 50–59 | 🔵 Round of 16 |
| <50 | ⚫ Group Stage Exit |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| — | — | — |
