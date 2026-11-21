# palmshade-heat-3d

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/khzhuman/palmshade-heat-3d/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/khzhuman/palmshade-heat-3d/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

PALMSHADE HEAT 3D — a 3D behind-the-car open-world crime game in Palmshade, a sun-soaked port city of four districts (Old Port, Neon Mile, Coral Heights, The Flats). Run four story jobs for fixer Mara Voss, steal any car on the street, fight on foot, and outrun a named police dispatch — cruisers with tactical roles, roadblocks, and the AIR-1 spotlight helicopter — while a live dispatch panel, mission card and circular minimap keep every system on screen. Built with Three.js (vendored as base64 text, decoded at runtime) and plain ES modules, one job per file; it runs fully offline as static files.

## How to play

You start on foot in Palmshade with $300 in your pocket. Walk up to Mara Voss (follow the marker) and press **E** to take a job, then follow the mission card and the minimap marker through each stage. Work through all four of Mara's jobs to beat the game.

**Controls**

| Input | On foot | In a car |
| --- | --- | --- |
| W A S D / arrow keys | Move | Accelerate, brake / reverse, steer |
| Shift | Sprint | — |
| Space | Fire your pistol | Handbrake |
| E | Talk to Mara · steal a car · use the Shine Shop | Get out |
| M | Toggle the full map | Toggle the full map |

Any car on the street can be stolen — walk up to one and press **E**.

**Wanted and the police** — crimes raise your wanted level, up to 5 stars. Cruisers hunt you under named dispatch callsigns (PALM-1 through PALM-6), roadblocks appear at 3 stars, and the AIR-1 spotlight helicopter joins the chase at 4. If a cruiser pins you while you are moving slowly, the bust meter fills — speed up and break contact to drain it. A short grace period right after you accept a wanted job, and again when you jump into a car during one, keeps the meter frozen while you pull away. Getting busted costs you 25% of your cash and puts you back on the street. Completing a job clears your wanted level completely; between jobs you can also pay at the **Shine Shop** — $150 per star — to clear it on the spot. Pedestrians near gunfire run and duck for cover, so a shootout empties the street fast.

**Mara's jobs**

1. **Hot Dock — $800.** Steal the marked car and deliver it to the Shine Shop against a 150-second clock.
2. **Neon Run — $1,500.** Collect three drops around the city with a 2-star wanted level already on you.
3. **Hill Debt — $2,500.** Drive to the villa, clear the rivals guarding it, grab the case, and escape back to the Shine Shop.
4. **Last Ferry — $4,000.** Run the roadblock gauntlet to the ferry ramp at 3 stars, against a 120-second clock.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=kac21arh&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
