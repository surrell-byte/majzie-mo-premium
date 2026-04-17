# Super Majzie Mo — Premium Edition

A cinematic street-fighter brawler built for **iPhone** and desktop browsers.

---

## File Structure

```
/
├── index.html              — Markup, screens, HUD, controls
├── style.css               — Full premium stylesheet
├── game.js                 — Game engine (sprites, physics, AI, UI)
├── majzie_sprites.jpeg     — Main sprite sheet (player + base enemies)
├── 9cb61436-...jpeg        — Expansion sprite sheet (biker, punk, blackOps)
└── assets/
    └── poster.jpg          — Title screen background (optional)
```

> **Important:** Sprite JPEGs must sit in the **same folder** as `index.html`.
> The `assets/poster.jpg` is optional — the title screen degrades gracefully without it.

---

## Controls

| Action   | Keyboard      | Mobile Button |
|----------|---------------|---------------|
| Move     | ← → (or A D)  | ◀ ▶           |
| Jump     | ↑ or Space    | ▲             |
| Punch    | Z             | 👊            |
| Kick     | X             | 💥            |
| Special  | C             | ⚡            |
| Pause    | P or Escape   | ⏸            |

---

## Features

- **Sprite-sheet rendering** — Majzie Mo + 6 enemy types drawn from pixel-art sheets
- **3 lives system** — respawn with invincibility frames; game over after 3 deaths
- **Level progression** — 8 kills per level; level clear bonus score; enemy pool expands at Level 2+
- **Combo system** — consecutive hits build a multiplier displayed in the HUD
- **Camera shake** — canvas translates on hit/death for physical impact
- **Haptic feedback** — `navigator.vibrate()` on attacks and taking damage
- **Score persistence** — best score saved to `localStorage`
- **Cinematic title screen** — parallax poster, animated rain, fire glow, letter-drop animation, neon flicker
- **Pause / Resume / Retry / Next Level** — all wired with both click and touchstart
- **iOS safe-area support** — `env(safe-area-inset-*)` throughout HUD and controls
- **Portrait + Landscape** — responsive at any iPhone screen size
- **No pull-to-refresh** — `touchmove` preventDefault keeps the game locked

---

## Enemy Types

| Type      | HP  | Speed | Unlocks    |
|-----------|-----|-------|------------|
| bigGuy    | 80  | 1.2   | Level 1    |
| ninja     | 50  | 1.9   | Level 1    |
| hoodGuy   | 50  | 1.9   | Level 1    |
| biker     | 65  | 2.3   | Level 2+   |
| punk      | 50  | 1.9   | Level 2+   |
| blackOps  | 65  | 2.3   | Level 2+   |

---

## Customisation Tips

- **Spawn rate**: Adjust `spawnInterval` formula in `game.js` → `update()`
- **Player damage output**: Edit `dmg` values in `updateEnemies()`
- **Jump height**: Change `player.vy = -15` in `triggerAttack` / keydown handler
- **Title poster**: Drop any image at `assets/poster.jpg`; update `#title-bg` background URL in `style.css`
