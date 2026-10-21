# Showreel videos

The site plays these files from its video cards:

| Card | Page | Video | Cover image |
| --- | --- | --- | --- |
| Meet Carl (intro) | `index.html` | `intro.mp4` | `intro.jpg` |
| Flow Auto demo | `flow-auto.html` | `flow-auto.mp4` | `flow-auto.jpg` |

To add a HealthNest walkthrough, put `healthnest.mp4` (and optionally `healthnest.jpg`) here, then copy the "See it in motion" section from `flow-auto.html` into `healthnest.html` before the "Next project" card and point its `data-video` and `data-poster` at the new files.

Tips
- Use MP4 (H.264), 1080p or 720p, and keep each file under ~50 MB. GitHub rejects files over 100 MB.
- `intro.mp4` and `flow-auto.mp4` are rendered from the Remotion project in `motion/` (see `motion/README.md`).
