"""Render narration lines with Kokoro TTS, then transcribe them back with Whisper to verify accuracy.

Usage: python3 scripts/voiceover.py <models_dir>
Writes public/vo/<video>/<id>.wav and src/timing.json (durations and per-sentence caption times in seconds).
"""
import json, re, sys, pathlib
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
import sherpa_onnx

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from voiceover_check import norm, wer  # noqa: E402

root = pathlib.Path(__file__).resolve().parent.parent
models = pathlib.Path(sys.argv[1])
VOICE, SPEED, GAP = "am_michael", 1.0, 0.22
SPLIT = re.compile(r"(?<=[.?!])\s+")

tts = Kokoro(str(models / "kokoro-v1.0.onnx"), str(models / "voices-v1.0.bin"))
w = models / "sherpa-onnx-whisper-small.en"
asr = sherpa_onnx.OfflineRecognizer.from_whisper(
    encoder=str(w / "small.en-encoder.int8.onnx"), decoder=str(w / "small.en-decoder.int8.onnx"),
    tokens=str(w / "small.en-tokens.txt"), num_threads=4)

script = json.loads((root / "scripts/narration.json").read_text())
timing, report = {}, []
for video, lines in script.items():
    out = root / "public/vo" / video
    out.mkdir(parents=True, exist_ok=True)
    timing[video] = []
    for line in lines:
        # One TTS call per sentence so captions can be timed exactly.
        says = SPLIT.split(line["say"]); texts = SPLIT.split(line["text"])
        assert len(says) == len(texts), line["id"]
        parts, sentences, t = [], [], 0.0
        for say, text in zip(says, texts):
            a, sr = tts.create(say, voice=VOICE, speed=SPEED, lang="en-us")
            sentences.append({"text": text, "start": round(t, 3), "end": round(t + len(a) / sr, 3)})
            parts += [a, np.zeros(int(GAP * sr), dtype=a.dtype)]
            t += len(a) / sr + GAP
        audio = np.concatenate(parts[:-1])
        sf.write(out / f"{line['id']}.wav", audio, sr)
        st = asr.create_stream(); st.accept_waveform(sr, audio); asr.decode_stream(st)
        heard = st.result.text.strip()
        e = wer(norm(line["say"]), norm(heard))
        timing[video].append({"id": line["id"], "seconds": round(len(audio) / sr, 3), "sentences": sentences})
        report.append(f"{video}/{line['id']}\t{e:.2f}\t{line['say']}\n\t\tHEARD: {heard}")
(root / "src/timing.json").write_text(json.dumps(timing, indent=2))
print("\n".join(report))
