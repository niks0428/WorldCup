# Findings — Lift the Trophy

## PRD Key Discoveries
- Inspired by 38-0-0 (PL draft game) — World Cup equivalent fills a real gap
- Fully client-side, no account required — zero infra cost
- Replayable in under 3 minutes per session
- Share mechanic: copy text to clipboard (no image generation in MVP)

## Player Object Schema
```json
{
  "name": "string",
  "nation": "string",
  "year": 2022,
  "positions": ["CB", "LB"],
  "overall": 85,
  "pac": 72,
  "sho": 45,
  "pas": 68,
  "dri": 71,
  "def": 86,
  "phy": 80
}
```

## Position Compatibility Rules
- Winger can fill wide midfielder slot
- Wing-back can fill full-back slot
- (Standard football convention applies elsewhere)

## Formations → Position Slot Mapping (to build out in formations.json)
- 4-3-3: GK, RB, CB, CB, LB, CM, CM, CM, RW, ST, LW
- 4-4-2: GK, RB, CB, CB, LB, RM, CM, CM, LM, ST, ST
- 4-2-3-1: GK, RB, CB, CB, LB, CDM, CDM, RAM, CAM, LAM, ST
- 3-5-2: GK, CB, CB, CB, RWB, CM, CM, CM, LWB, ST, ST
- 5-3-2: GK, RWB, CB, CB, CB, LWB, CM, CM, CM, ST, ST
- 3-4-3: GK, CB, CB, CB, RM, CM, CM, LM, RW, ST, LW
- 4-5-1: GK, RB, CB, CB, LB, RM, CM, CM, CM, LM, ST

## Scoring Algorithm (pseudocode from PRD)
```
baseScore = weighted avg of (player.overall * positionFitMultiplier) for all 11
teamScore = clamp(baseScore, 0, 99) → mapped to tier
weights: GK=0.08, DEF_avg=0.28, MID_avg=0.32, ATT_avg=0.32
```

## MVP Nations + Tournaments (16 nations × 8 tournaments)
Nations: Brazil, Argentina, France, Germany, Spain, England, Portugal, Italy,
         Netherlands, Croatia, Uruguay, Belgium, Mexico, Senegal, Japan, Morocco
Tournaments: 2022, 2018, 2014, 2010, 2006, 2002, 1998, 1994

## Technical Notes
- Vite + React — fastest static build for this scale
- Tailwind for utility-first responsive layout
- No router needed — simple screen state in App.jsx (setup → draft → result)
- Data files imported at build time → zero runtime fetches
