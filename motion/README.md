# Motion videos (Remotion)

Source for the two showreel videos on the site:

| Composition | Output | Site card |
| --- | --- | --- |
| `FlowAuto` | `videos/flow-auto.mp4` | Flow Auto demo |
| `Services` | `videos/intro.mp4` | Meet Carl |

Both are 1920×1080 at 30 fps, with narrated voiceover, burned-in captions timed per sentence, and a synthesized music bed.

## Narration

All narration lives in `scripts/narration.json`. Each line has:

- `say`: what the voice reads, spelled for the speech model (for example "ten-eighty p", "M C P").
- `text`: the caption shown on screen. It must have the same number of sentences as `say`.

Every claim in the narration comes from the site's own copy (`index.html`), so the videos never promise something the site doesn't.

## Rebuild

```bash
npm install
# 1. Voiceover: Kokoro TTS (voice am_michael), then a Whisper transcription check per line.
#    Needs kokoro-v1.0.onnx, voices-v1.0.bin and sherpa-onnx-whisper-small.en in <models_dir>.
python3 -m pip install kokoro-onnx soundfile sherpa-onnx
python3 scripts/voiceover.py <models_dir>
# 2. Music bed (pure numpy, nothing downloaded)
python3 scripts/music.py
# 3. Render
node render.mjs            # out/flow-auto.mp4, out/intro.mp4
node render.mjs posters    # out/flow-auto.jpg, out/intro.jpg
node render.mjs stills     # two review frames per scene in out/stills/
npm run studio             # live preview
```

The voiceover script prints each line next to what Whisper heard, with a word error rate after normalizing spelled-out terms. Anything above 0.00 is worth a listen.

Set `REMOTION_BROWSER` to a Chrome headless shell path if Remotion can't download its own.

Model files: Kokoro from https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0), Whisper from https://github.com/k2-fsa/sherpa-onnx/releases (asr-models).
