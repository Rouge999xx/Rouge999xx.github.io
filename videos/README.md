# Showreel videos

Drop files here with these exact names and the matching card on the site becomes playable (no code changes needed):

| Card | Video | Optional cover image |
| --- | --- | --- |
| Meet Carl (intro) | `intro.mp4` | `intro.jpg` |
| Flow Auto demo | `flow-auto.mp4` | `flow-auto.jpg` |
| HealthNest walkthrough | `healthnest.mp4` | `healthnest.jpg` |
| Barangay Case Management | `barangay.mp4` | `barangay.jpg` |
| NurseDesk tour | `nursedesk.mp4` | `nursedesk.jpg` |

Tips
- Use MP4 (H.264), 1080p or 720p, and keep each file under ~50 MB. GitHub rejects files over 100 MB.
- For long videos, upload to YouTube instead and put the video ID on the card in `index.html`: `data-youtube="VIDEO_ID"`.

`intro.mp4` and `flow-auto.mp4` are rendered from the Remotion project in `motion/` (see `motion/README.md`).
