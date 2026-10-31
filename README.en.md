<p align="right">
  🌐 <a href="README.md">Bahasa Indonesia</a> • <b>English</b>
</p>

# COUP · Pixel Court

> A retro pixel-art digital adaptation of the social deduction & bluffing board game **Coup**, featuring procedural chiptune audio synthesis and a server-authoritative anti-cheat architecture.

---

## Background

Physical card games like **Coup** are a blast to play with friends, but are often hindered by **distance, busy schedules, and separate locations**. Gathering 3 to 6 people in the same room isn't always possible.

This project was built so you and your friends can play Coup together **anytime, from anywhere**:
* Simply share the invite link or 4-digit room code via chat.
* Play directly in your web browser on mobile, tablet, or laptop without installing any apps, registering accounts, or remembering passwords.
* Enjoy an immersive court experience with Game Master commentary, card animations, and retro sound effects.

---

## Characters & Game Assets

All visual assets are crafted in retro pixel-art resolution with a tailored palette and rendered crisply (`image-rendering: pixelated`).

### 1. Game Master (Court Jester)

<p align="center">
  <img src="public/ui/gm.png" alt="Game Master Sprite" width="384" style="image-rendering: pixelated;" />
</p>

Acts as the neutral court adjudicator. The Game Master features an animated sprite (idle, blink, talk, and cheer) that dynamically narrates turns, role claims, challenge declarations, and player eliminations via speech bubbles.

### 2. Influence Cards

Each player starts with 2 secret cards representing court nobles with unique abilities:

| Card | Character | Role & Actions | Blocked By |
| :---: | :---: | :--- | :--- |
| <img src="public/cards/duke.png" width="90" alt="Duke" /> | **Duke** | Takes **Tax** (3 coins) from the treasury. Blocks Foreign Aid. | — |
| <img src="public/cards/assassin.png" width="90" alt="Assassin" /> | **Assassin** | Pays 3 coins to launch an **Assassination** against another player. | Contessa |
| <img src="public/cards/captain.png" width="90" alt="Captain" /> | **Captain** | Performs **Steal** (takes 2 coins from another player). Blocks stealing. | Captain, Ambassador |
| <img src="public/cards/ambassador.png" width="90" alt="Ambassador" /> | **Ambassador** | Performs **Exchange** (swaps hand cards with the deck). Blocks stealing. | — |
| <img src="public/cards/contessa.png" width="90" alt="Contessa" /> | **Contessa** | Has no offensive action, but blocks any **Assassination** attempt. | — |
| <img src="public/cards/back.png" width="90" alt="Card Back" /> | **Card Back** | Face-down card design. Opponent cards in hand are kept strictly secret by the server. | — |

### 3. UI Assets & Tokens

| Asset | Name | Technical Role |
| :---: | :--- | :--- |
| <img src="public/cards/coin.png" width="40" alt="Coin" /> | **Gold Coin** | Game currency. Collected to fund actions and force a coup (*Coup* costs 7 coins, mandatory at 10 coins). |
| <img src="public/cards/skull.png" width="40" alt="Skull" /> | **Eliminated (Skull)** | Placed over a card when an influence is lost due to a failed challenge or coup. |
| <img src="public/cards/crown.png" width="40" alt="Crown" /> | **Winner (Crown)** | Bestowed upon the sole surviving courtier at the end of the game. |
| <img src="public/cards/heart.png" width="40" alt="Heart" /> | **Alive Status** | Influence integrity indicator for players during the match. |
| <img src="public/ui/msg.png" width="40" alt="Log Message" /> | **Message History** | Interactive log panel icon to review every turn action from start to finish. |

---

## Key Features

* **Anti-Cheat Architecture (View Isolation):** The actual game state, hidden opponent cards, and deck contents are never sent to the client browser. Clients only receive their own sanitized view snapshot, rendering browser DevTools inspection useless.
* **Auto-Takeover & Session Resume:** If a player disconnects or stays inactive for 12 seconds, an intelligent bot temporarily takes over. Players can reclaim their seat instantly upon refreshing the browser tab.
* **3 Discard Rule Variations:**
  1. *Classic*: Lost cards remain face-up in front of the player (official Coup rules).
  2. *Back to Deck (Revealed)*: Cards are revealed to everyone, then placed at the bottom of the deck.
  3. *Back to Deck (Secret)*: Cards go directly to the bottom of the deck without being revealed to anyone.
* **Solo Practice Mode (Offline):** Play against smart bots in local browser memory without needing any internet connection.
* **Bilingual Support (i18n):** The interface and narration logs are fully localized in **English** and **Bahasa Indonesia**, switchable on-the-fly via the Settings panel.

---

## Tech Stack & Architecture

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![Web Audio API](https://img.shields.io/badge/Web_Audio_API-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Vercel](https://img.shields.io/badge/Vercel_Serverless-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-00E9A3?style=for-the-badge&logo=redis&logoColor=black)](https://upstash.com/)
[![Python](https://img.shields.io/badge/Python_3-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)

### 1. Frontend & State Management
* **React 18 & External Store:** Leverages `useSyncExternalStore` to reactively synchronize room snapshots from the session layer without redundant re-renders.
* **Framer Motion:** Drives smooth card dealing animations, 2D popup transitions, and floating notifications.
* **Custom Pixel Easing:** Card animations utilize step-based easing functions to preserve the crunchy, quantized feel of classic 8-bit/16-bit sprite animations.

### 2. Procedural Chiptune Audio (WebAudio API)
This project requires **0 KB of audio downloads**. Every sound effect (button clicks, card deals, coin clinks, victory fanfares, and bluff reveals) is procedurally synthesized directly in the browser via the WebAudio API:
* `square` and `triangle` wave oscillators for melodic notes and arpeggios.
* `sawtooth` oscillators for tension cues and failed challenges.
* Sample-and-hold pseudo-random noise buffers to simulate card shuffles and retro 8-bit noise.

### 3. Serverless Backend & Optimistic Concurrency Control
* **Vercel Serverless Function (`api/game.js`):** A stateless Node.js endpoint acting as the authoritative Game Master to validate Coup moves.
* **Upstash Redis REST API & Atomic Lua Scripts:** Room storage leverages an atomic **Compare-and-Swap (CAS)** pattern via Lua scripts. This optimistic concurrency control ensures concurrent requests never overwrite each other (*zero race conditions*).
* **Vite Middleware Dev Server (`vite.config.js`):** Uses `configureServer` and `server.ssrLoadModule` to execute the `/api/game` handler against local memory during dev mode, eliminating any local Redis or Vercel CLI requirements.

### 4. Graphic Asset Pipeline (Python & Pillow)
Card and UI art originates from SVG vector sources in `assets-src/`. Automated Python generator scripts (`scripts/make-pixel-art.py` and `scripts/make-gm.py`) rasterize vectors to crisp pixel dimensions, map color palettes, and output PNG sprite sheets ready for production.
