# Aryan Jain — portfolio

A night walk through a live WebGL temple, built on Meng To's three studies:

- **Kage**: the world, the camera that travels with the scroll, the foreground cut-outs, the editorial type. The chapters carry my work instead of a temple guide.
- **Towers**: a five-storey pagoda in the same valley that builds itself course by course as you scroll through *The Build*. A clipping plane rises through it and the scaffolding waits above the line. Each course is a layer of my stack.
- **Sketchbook**: the *field notes*. Click any project and a sketchbook opens over the night. You can drag or throw the pages, or drag the brass magnifier across the screenshots.

## Run it

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 4180 --bind 127.0.0.1
```

Then open <http://127.0.0.1:4180/>.

Useful URL flags:
- `?notes=0`–`8` opens the field notes on a project.
- `?shot=N` jumps to a chapter for screenshots.
- `?nogl=1` shows the no-WebGL fallback.

## Layout

```text
index.html                 the whole site: chapters, styles, the three.js world, the pagoda
js/fieldnotes.js           the sketchbook engine (page curl, loupe, riffle) as a dialog
fieldnotes/*.webp          one spread per project, generated from the project screenshots
assets/                    portrait and résumé
secret-pathways-assets/    Kage's three.js r149, fonts (re-subset), plates and cut-outs
```

## Editing content

- Chapter text lives in `index.html`. Each section is commented, for example `chapter I`.
- The stack shown in *The Build* is the `<ol id="stages">` list. The captions over the tower are in `STAGES` inside the pagoda block.
- Projects in the field notes are listed in `PAGES` at the top of `js/fieldnotes.js`. Their spreads are images. `tools/make_spreads.py` regenerates them from text and screenshots. It expects a Sketchbook spread PNG, a `shots/` folder and the fonts listed in its header, all next to it (`pip install pillow numpy fonttools brotli`).

## Credits

- [Kage](https://github.com/MengTo/kage), [Towers](https://github.com/MengTo/towers) and [Sketchbook](https://github.com/MengTo/sketchbook) by Meng To. The Kage world and its artwork come from the MIT-licensed copy in [MengTo/Skills](https://github.com/MengTo/Skills). The Towers and Sketchbook repositories grant no licence for reuse, so treat this as a personal study and keep it private unless you have Meng To's permission.
- three.js r149 (MIT). Onest, Poppins, Noto Sans JP, Noto Serif JP, Instrument Serif and Newsreader (SIL OFL).
