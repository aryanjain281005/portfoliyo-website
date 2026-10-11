# KAGE × ARYAN: portfolio plan (v2)

v1 (the stepwell concept) was rejected. v2 builds **directly on Meng To's three references**, with their theme, layout, motion and, where the license allows, their actual code and assets.

Status: **built** (v2). Kage base, the Towers pagoda as chapter 03, and the Sketchbook as the field-notes dialog. The Wordoo plate covers the dyslexia / Akshara Path work too. Hosting: GitHub Pages (static, no build).

---

## 1. What we may legally reuse (checked 2026-10-11)

| Source | License | What we do |
|---|---|---|
| **Kage**, via `MengTo/Skills` → `build-threejs-scroll-worlds/demo/` | **MIT** (Meng To republished the full Kage demo there: index.html, three.js, 4 scene plates, 10 foreground cutouts) | **Use as the base.** Fork the code and assets and keep the MIT notice and credit. |
| Kage, original `MengTo/kage` repo | "No licence granted for reuse" | Not used. The MIT copy above replaces it. |
| **Towers** (`MengTo/towers`) | "No licence granted for reuse or redistribution" | **Rebuild the technique ourselves:** a clipping plane rising through a procedural tower, bilingual stage captions, a huge %, a scrubber. Same look, our own code. None of its textures or audio. |
| **Sketchbook** (`MengTo/sketchbook`) | No license file, so all rights reserved | **Rebuild the technique ourselves:** a page curl made of nested strips, drag/throw to turn, and the brass magnifier. Our own code and our own page content. |
| three.js r149 | MIT | Use it (it's vendored with Kage). |

The result looks and feels like the three references, and every file we ship is either MIT-licensed or written by us.

---

## 2. Page map (Kage's structure, filled with Aryan's content)

Kage's five sections map almost one-to-one onto a portfolio:

| Kage section | Becomes | Content |
|---|---|---|
| Loader: "Raising the mountain temple" | Same loader | `影の道` → **"Raising the path · ARYAN JAIN · 100%"** |
| `#hero`: giant **KAGE** letters, temple, moon, chips 01–04 | **Giant ARYAN letters**, same world | "Builds where technology meets business." CSE @ IIIT Naya Raipur. Chips: Work / Build / Path / Contact |
| `#gate`: "Charred cypress…" with the 05/92/1611/∞ stats row | **About** | Your photo (graded into the night palette; the misty mountain already matches Kage). Codeforces origin, B.Tech 2025–29. Stats: **9.3** SGPA · **27** repos · **3** live products · **1** business |
| `#pathways`: three cinematic image cards with a play button | **Selected work**: IMPOSTER · VyanaSoul · Wordoo | Clicking a card opens **the Sketchbook** (below) |
| *new chapter* | **"Build": the Towers moment** | A tenshu that builds itself. Each course is part of your stack, with bilingual stage captions: 石垣 / FOUNDATIONS (C++, Python, DSA) → 木組 / FRAME (React, Next.js, Flutter) → 漆喰 / CORE (Supabase, Postgres, Node) → 瓦 / AUTOMATION (n8n, RAG, agents) → 完成 / SHIPPED. % counter and scrubber included |
| `#lessons`: "Five chapters. Ninety minutes." with 5 cards plus kanji | **Path**: "Five chapters. One builder." | NTPC Dadri 発電 · Sigmoid 広報 · AI/ML Club 知能 · HackAsol 挑戦 · Finance Club 意匠 |
| `#eternity`: AFTERLIGHT vertical, "Begin the walk" | **Contact**: vertical **"WRITE TO ME"** | Email, GitHub, LinkedIn, resume |
| Footer manifesto | Footer | A short manifesto and credits (Meng To / MIT) |

### The Sketchbook (project case studies)
A modal book in Meng To's sketchbook style. **Each project is one spread:** the left page holds the story, role, stack and links in serif; the right page holds a screenshot of the live product washed in paper and ink. Drag or throw to turn pages, and drag the brass magnifier across the screenshot. Its index works like Sketchbook's "Plates" list: IMPOSTER, VyanaSoul, Wordoo, then PrithviNet, TruthStamp, Travel AI, Spendly, SkillScout.

### Theme kept from Kage
The near-black, blue-charcoal, amber, bone and vermilion palette; the vermilion moon; maple leaves; fog and rain; grain and vignette; the custom cursor; word-by-word reveals; foreground cutouts pinned at the bottom of the viewport; the chapter rail; vertical Japanese display type (given new words that fit your content).

---

## 3. Tech
- Same as the references: **static HTML, vendored three.js r149, no build step.** Split into `index.html`, `js/world.js` (Kage base), `js/tower.js` (our Towers rebuild), `js/sketchbook.js` (our Sketchbook rebuild), `js/content.js` (all text in one place) and `assets/`.
- Works under a GitHub Pages subpath with relative paths, and also deploys to Vercel.
- All content stays in semantic HTML, so it reads fine with JS off and the "skip" path works.
- Keep Kage's reduced-motion behaviour and its mobile layout.

## 4. Phases and how each is verified
1. **Fork Kage (MIT) and swap in your content.** *Check:* desktop and 390×844 screenshots, every section scrolls correctly, nothing 404s, console clean.
2. **Towers chapter.** *Check:* build scrubbed at 0/25/50/75/100%, no gaps in the cut cap, reverse scrolling works.
3. **Sketchbook modal.** *Check:* drag, throw and tap turning, magnifier, keyboard (←/→/Esc), mobile tap-to-turn.
4. **Project imagery.** Screenshots of the live sites, graded and art-directed. *Check:* all of them look consistent.
5. **QA and deploy.** Lighthouse, FPS, reduced motion, no-WebGL fallback, then GitHub push and Pages/Vercel.

## 5. Known facts / gaps
- Live: vyanasoul.vercel.app, travel-ai-drab.vercel.app and Spendly (Railway) return 200. **The IMPOSTER Vercel URL returns 404.**
- LinkedIn is behind an authwall, so it's pending the user's help.
- The portrait is saved at `assets/source/aryan-portrait.webp`.
