"""Synthesize a soft ambient music bed (no samples, nothing downloaded).

Usage: python3 scripts/music.py   -> public/music/bed.wav (150 s, loops cleanly at chord boundaries)
"""
import pathlib
import numpy as np, soundfile as sf

SR, BPM, SECONDS = 44100, 84, 150
root = pathlib.Path(__file__).resolve().parent.parent
beat = 60 / BPM
bar = beat * 4

def hz(m):
    return 440 * 2 ** ((m - 69) / 12)

# Am9 - Fmaj7 - Cadd9 - G6, voiced low and open.
chords = [[45, 57, 60, 64, 71], [41, 57, 60, 64, 69], [48, 55, 62, 64, 67], [43, 55, 59, 64, 69]]
n = int(SR * SECONDS)
t = np.arange(n) / SR
out = np.zeros((n, 2))
rng = np.random.default_rng(7)

for i in range(int(SECONDS / bar) + 1):
    c = chords[i % 4]
    s, e = int(i * bar * SR), min(n, int((i + 1.15) * bar * SR))
    if s >= n:
        break
    tt = t[s:e] - t[s]
    env = np.minimum(1, tt / 1.6) * np.minimum(1, (tt[-1] - tt) / 1.2 + 0.001)
    for k, m in enumerate(c):
        f = hz(m)
        det = 1 + 0.0025 * (k % 2 * 2 - 1)
        tone = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * f * 2 * det * tt) + 0.12 * np.sin(2 * np.pi * f * 3 * tt)
        pan = 0.5 + 0.35 * np.sin(k * 1.7)
        gain = 0.09 if k == 0 else 0.05
        out[s:e, 0] += tone * env * gain * (1 - pan)
        out[s:e, 1] += tone * env * gain * pan
    # Gentle arpeggio plucks on eighth notes.
    for j in range(8):
        ps = s + int(j * beat / 2 * SR)
        if ps >= n:
            break
        m = c[1:][(j * 3 + i) % 4] + 12
        L = min(int(SR * 1.2), n - ps)
        pt = np.arange(L) / SR
        pl = np.sin(2 * np.pi * hz(m) * pt) * np.exp(-pt * 4.5) * 0.045
        side = 0.3 if j % 2 else 0.7
        out[ps:ps + L, 0] += pl * (1 - side)
        out[ps:ps + L, 1] += pl * side

# Soft kick on beats 1 and 3, and a hushed noise hat on offbeats.
for b in range(int(SECONDS / beat)):
    s = int(b * beat * SR)
    if b % 2 == 0:
        L = min(int(SR * 0.35), n - s)
        kt = np.arange(L) / SR
        k = np.sin(2 * np.pi * (48 + 60 * np.exp(-kt * 28)) * kt) * np.exp(-kt * 9) * 0.22
        out[s:s + L] += k[:, None]
    hs = s + int(beat / 2 * SR)
    L = min(int(SR * 0.06), max(0, n - hs))
    if L:
        h = rng.standard_normal(L) * np.exp(-np.arange(L) / SR * 70) * 0.025
        h = np.diff(h, prepend=0)
        out[hs:hs + L, 0] += h * 0.6
        out[hs:hs + L, 1] += h

# Simple room: a couple of delayed, damped copies.
for d, g in [(0.113, 0.22), (0.271, 0.14), (0.43, 0.08)]:
    k = int(d * SR)
    out[k:, 0] += out[:-k, 1] * g
    out[k:, 1] += out[:-k, 0] * g

fade = int(SR * 3)
out[-fade:] *= np.linspace(1, 0, fade)[:, None]
out /= np.max(np.abs(out)) / 0.8
(root / "public/music").mkdir(parents=True, exist_ok=True)
sf.write(root / "public/music/bed.wav", out.astype(np.float32), SR)
print("wrote public/music/bed.wav")
