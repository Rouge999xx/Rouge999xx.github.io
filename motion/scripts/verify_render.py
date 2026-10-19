"""Transcribe a rendered video scene by scene and compare with the narration it should contain.

Checks the final mix (voice + music) and the timing: each window is cut exactly where the
narrator's line should be, so a drifted or missing clip shows up as a mismatch.
Usage: python3 scripts/verify_render.py <models_dir> <video key> <mp4>
"""
import json, math, pathlib, subprocess, sys
import numpy as np
import sherpa_onnx

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from voiceover_check import norm, wer  # noqa: E402

root = pathlib.Path(__file__).resolve().parent.parent
models, key, mp4 = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
w = models / "sherpa-onnx-whisper-small.en"
asr = sherpa_onnx.OfflineRecognizer.from_whisper(
    encoder=str(w / "small.en-encoder.int8.onnx"), decoder=str(w / "small.en-decoder.int8.onnx"),
    tokens=str(w / "small.en-tokens.txt"), num_threads=4)
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.float32)
timing = json.loads((root / "src/timing.json").read_text())[key]
script = {l["id"]: l for l in json.loads((root / "scripts/narration.json").read_text())[key]}
t, worst = 0.0, 0.0
for l in timing:
    for s in l["sentences"]:
        a, b = t + 0.6 + s["start"], t + 0.6 + s["end"]
        st = asr.create_stream(); st.accept_waveform(16000, audio[int(a * 16000):int(b * 16000)]); asr.decode_stream(st)
        e = wer(norm(s["text"]), norm(st.result.text))
        worst = max(worst, e)
        print(f"{e:.2f}\t{s['text']}\n\tHEARD: {st.result.text.strip()}")
    t += math.ceil((0.6 + l["seconds"] + 0.7) * 30) / 30
print(f"worst sentence WER: {worst:.2f}")
