"""Synthesize the modern-UI / tech-trailer SFX kit (pure numpy, nothing downloaded).

Usage: python scripts/sfx.py  -> public/sfx/*.wav (48 kHz stereo float) + public/sfx/cues.json

Every file has a documented "hit" offset (hit_s): the moment that should line up
with the visual event. In Remotion, start the clip at  eventFrame - round(hit_s * 30).
"""
import json
import math
import pathlib
import sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _dsp import (SR, n_of, times, rng, hz, fft_gain, lowpass, highpass, bandpass, sweep, sine, saw,  # noqa: E402
                  pan, stereo, sat, chorus, reverb, cymbal, finalize, stats, write)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'sfx'


def pink(n, seed, ch=2):
    w = rng(seed).standard_normal((n, ch))
    p = fft_gain(w, lambda f: 1.0 / np.sqrt(np.maximum(f, 30.0) / 30.0))
    return p / (p.std() + 1e-12)


def balance(x, p):
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.stack([x[:, 0] * np.cos(a), x[:, 1] * np.sin(a)], 1) * math.sqrt(2)


def asym_bell(t, peak, w_left, w_right):
    w = np.where(t < peak, w_left, w_right)
    return np.exp(-0.5 * ((t - peak) / w) ** 2)


def bell(f, n, decay, ratio=3.5, index=2.0, bright_decay=0.08):
    t = times(n)
    idx = index * np.exp(-t / bright_decay)
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * ratio * t))
    y += 0.25 * np.sin(2 * np.pi * f * 2.756 * t) * np.exp(-t / (decay * 0.4))
    return y * np.exp(-t / decay) * (1 - np.exp(-t / 0.0008))


# ------------------------------------------------------------------ sounds
def whoosh_gen(dur, peak, seed, f_lo, f_hi, width, body):
    n = n_of(dur)
    t = times(n)
    env = asym_bell(t, peak, peak / 2.6, (dur - peak) / 3.2)
    noise = 0.65 * pink(n, seed, 1) + 0.45 * pink(n, seed + 1, 2)
    swish = sweep(noise, f_lo * (f_hi / f_lo) ** env, 'bp', q=1.1) * env[:, None]
    air = highpass(pink(n, seed + 2, 2), 6500, 2) * (env ** 2.5)[:, None] * 0.22
    x = swish + air
    if body:
        x += stereo(sine(55 + 70 * env, n) * env ** 2 * body)
    x = balance(x, width * np.tanh((t - peak) / (0.3 * dur)))
    return x + reverb(x, t60=0.7, predelay=0.01, damp=6000, seed=seed + 3) * 0.18


def whoosh():
    return whoosh_gen(0.9, 0.45, 1, 350, 3200, 0.85, 0.25)


def whoosh_short():
    return whoosh_gen(0.4, 0.17, 11, 600, 5000, 0.6, 0.0)


def impact():
    n = n_of(2.0)
    t = times(n)
    r = rng(21)
    sub = sine(35 + 20 * np.exp(-t / 0.35), n) * (1 - np.exp(-t / 0.002)) * np.exp(-t / 0.7)
    sub = sat(sub * 1.2, 2.2)
    punch = sine(48 + 150 * np.exp(-t / 0.022), n) * np.exp(-t / 0.08) * (1 - np.exp(-t / 0.0006))
    crack = bandpass(r.standard_normal(n) * np.exp(-t / 0.005), 3200, 0.7) * 1.6
    tail = lowpass(r.standard_normal((n, 2)), 2200, 2) * (np.exp(-t / 0.32) * (1 - np.exp(-t / 0.004)))[:, None] * 0.22
    dry = stereo(sub * 0.95 + punch * 0.55 + crack * 0.5) + tail
    wet = highpass(reverb(dry, t60=1.7, predelay=0.012, damp=4500, seed=22), 160, 2) * 0.28
    return dry + wet


def riser():
    dur = 2.0
    n = n_of(dur)
    t = times(n)
    u = t / dur
    r = rng(31)
    env = u ** 2.2
    hiss = sweep(r.standard_normal((n, 2)), 300 * (9000 / 300) ** (u ** 1.4), 'bp', q=1.4) * env[:, None]
    f = 110 * 8 ** (u ** 1.7)
    trem = 0.7 + 0.3 * np.sin(2 * np.pi * np.cumsum(4 + 20 * u ** 2) / SR)
    tone = np.stack([saw(f * 0.996, n) + 0.6 * sine(f * 0.5, n),
                     saw(f * 1.004, n, 0.37) + 0.6 * sine(f * 0.5, n)], 1)
    tone = sweep(tone, 500 * 12 ** u, 'lp', q=1.2) * (env ** 1.2 * trem)[:, None] * 0.35
    x = hiss + tone
    return x + reverb(x, t60=0.9, predelay=0.01, damp=7000, seed=32) * 0.15


def reverse():
    dur = 1.2
    n = n_of(dur)
    t = times(n)
    fwd = cymbal(dur, 41, decay=0.45)
    fwd = fwd + reverb(fwd, t60=1.2, predelay=0.01, damp=8000, seed=42) * 0.5
    x = fwd[::-1].copy()
    x += stereo(sine(70 + 30 * (t / dur), n) * (t / dur) ** 4 * 0.25)
    return x


def pop():
    n = n_of(0.15)
    t = times(n)
    f = 380 + 560 * (1 - np.exp(-t / 0.010))
    amp = (1 - np.exp(-t / 0.0012)) * np.exp(-t / 0.032)
    s = (sine(f, n) + 0.15 * sine(2 * f, n) * np.exp(-t / 0.012)) * amp
    s = sat(s * 1.3, 1.4)
    s += lowpass(rng(51).standard_normal(n) * np.exp(-t / 0.0008), 6000, 2) * 0.06
    s = lowpass(s, 5500, 2)
    x = np.stack([s, np.roll(s, 10)], 1)
    x[:10, 1] = 0
    return x


def click():
    n = n_of(0.05)
    t = times(n)
    s = bandpass(rng(61).standard_normal(n) * np.exp(-t / 0.0012), 4500, 0.9)
    s += sine(2600.0, n) * np.exp(-t / 0.004) * 0.35
    s += sine(950.0, n) * np.exp(-t / 0.006) * 0.25
    return stereo(highpass(s, 300, 2))


def tick_soft():
    n = n_of(0.045)
    t = times(n)
    s = lowpass(rng(71).standard_normal(n) * np.exp(-t / 0.0018), 2600, 2)
    s += sine(1500.0, n) * np.exp(-t / 0.005) * 0.3
    return stereo(highpass(s, 250, 2))


PENTA = [77, 79, 81, 84, 86, 89, 91, 93, 96, 98]  # F major pentatonic, F5..D7


def shimmer():
    dur, hit = 1.5, 0.08
    n = n_of(dur)
    r = rng(81)
    buf = np.zeros((n, 2))

    def ping(t0, m, v, decay, p):
        s0 = n_of(t0)
        if s0 < n:
            buf[s0:] += pan(bell(hz(m), n - s0, decay) * v, p)

    for k, (dt, m) in enumerate([(0.0, 84), (0.03, 89), (0.055, 93)]):
        ping(dt, m, 0.25, 0.25, -0.5 + 0.5 * k)
    for k, m in enumerate([81, 84, 89, 93]):
        ping(hit + 0.012 * k, m, 0.8, 0.75, (-0.45, 0.15, -0.15, 0.45)[k])
    for _ in range(18):
        t0 = hit + min(0.95, r.exponential(0.25))
        m = PENTA[int(r.integers(3, len(PENTA)))]
        ping(t0, m, r.uniform(0.15, 0.45) * (1 - t0 / dur), r.uniform(0.25, 0.5), r.uniform(-0.8, 0.8))
    t = times(n)
    sparkle = highpass(rng(82).standard_normal((n, 2)), 8000, 2) * asym_bell(t, 0.15, 0.06, 0.35)[:, None] * 0.06
    x = buf + sparkle
    return x + reverb(x, t60=1.4, predelay=0.02, damp=9000, seed=83) * 0.45


def glitch():
    dur = 0.4
    n = n_of(dur)
    t = times(n)
    r = rng(91)
    src = 0.5 * saw(220.0, n) + 0.4 * saw(331.0, n, 0.2) + 0.3 * saw(55.0, n, 0.5)
    src += 0.35 * r.standard_normal(n)
    src += 0.4 * sine(1200 + 800 * np.sign(np.sin(2 * np.pi * 37 * t)), n)
    src = lowpass(src, 9000, 2)
    src /= np.max(np.abs(src)) + 1e-12
    out = np.zeros((n, 2))
    modes = ['stutter', 'crush', 'hold', 'silence', 'plain', 'pitch']
    probs = [0.28, 0.2, 0.2, 0.1, 0.1, 0.12]
    pos = 0
    while pos < n:
        L = min(n - pos, n_of(r.uniform(0.012, 0.045)))
        if L < 8:
            break
        mode = modes[int(r.choice(len(modes), p=probs))]
        seg = src[pos:pos + L].copy()
        if mode == 'stutter':
            unit = min(L, max(48, n_of(r.uniform(0.003, 0.012))))
            seg = np.tile(src[pos:pos + unit], L // unit + 1)[:L]
        elif mode == 'crush':
            q = 2 ** int(r.integers(2, 5))
            seg = np.round(seg * q) / q
        elif mode == 'hold':
            k = int(r.integers(4, 24))
            seg = np.repeat(seg[::k], k)[:L]
        elif mode == 'silence':
            seg *= 0.0
        elif mode == 'pitch':
            ratio = float(r.choice([0.5, 1.5, 2.0]))
            seg = seg[(np.arange(L) * ratio).astype(int) % L]
        ramp = min(L // 2, 24)
        w = np.ones(L)
        w[:ramp] = np.linspace(0, 1, ramp)
        w[L - ramp:] = np.linspace(1, 0, ramp)
        out[pos:pos + L] += pan(seg * w * r.uniform(0.6, 1.0), r.uniform(-0.8, 0.8))
        pos += L
    out *= (np.exp(-t / 0.5) * (0.7 + 0.3 * (t < 0.06)))[:, None]
    out = highpass(out, 120, 2)
    return out + reverb(out, t60=0.5, predelay=0.005, damp=7000, seed=92) * 0.1


def ep_tone(f, n, decay):
    t = times(n)
    idx = 1.1 * np.exp(-t / 0.05)
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    y += 0.12 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.1)
    y += 0.18 * np.sin(np.pi * f * t)
    return y * np.exp(-t / decay) * (1 - np.exp(-t / 0.0015))


def success():
    n = n_of(0.6)
    buf = np.zeros((n, 2))
    for t0, m, dec, p, v in [(0.0, 77, 0.22, -0.15, 0.8), (0.11, 84, 0.35, 0.15, 1.0)]:
        s0 = n_of(t0)
        buf[s0:] += pan(ep_tone(hz(m), n - s0, dec) * v, p)
    x = lowpass(chorus(buf, 8, 1.5, 1.2, 0.3), 7000, 2)
    return x + reverb(x, t60=1.0, predelay=0.015, damp=7000, seed=101) * 0.25


def logo_sting():
    dur, hit = 2.5, 0.3
    n = n_of(dur)
    t = times(n)
    r = rng(111)
    post = t >= hit
    thp = np.maximum(t - hit, 0)
    u = np.clip(t / hit, 0, 1)
    swell = sweep(r.standard_normal((n, 2)), 1500 + 6500 * u, 'bp', q=0.9) * np.where(post, 0, u ** 3)[:, None] * 0.5
    sub = sine(np.where(post, 40 + 22 * np.exp(-thp / 0.3), 62.0), n)
    sub = sat(sub * np.where(post, (1 - np.exp(-thp / 0.003)) * np.exp(-thp / 0.8), 0) * 0.9, 1.8)
    thud = lowpass(r.standard_normal(n), 1400, 2) * np.where(post, np.exp(-thp / 0.012), 0) * 0.6
    chord = np.zeros((n, 2))
    for m in [65, 69, 72, 76, 79, 84]:  # Fmaj9 spread
        for c, p in zip([-12, -5, 0, 5, 12], [-0.7, -0.35, 0.0, 0.35, 0.7]):
            chord += pan(saw(hz(m) * 2 ** (c / 1200), n, r.random()), p) * (1.0 if c == 0 else 0.7)
    cenv = np.where(post, (1 - np.exp(-thp / 0.2)) * np.exp(-thp / 1.1), 0)
    cut = 800 + 6200 * (1 - np.exp(-thp / 0.18)) * np.exp(-thp / 1.4)
    chord = chorus(sweep(chord, cut, 'lp', q=0.9) * cenv[:, None] * 0.12, 12, 3, 0.8, 0.4)
    bells = np.zeros((n, 2))
    for k, m in enumerate([77, 81, 84, 89, 93, 96]):
        s0 = n_of(hit + 0.05 * k)
        bells[s0:] += pan(bell(hz(m), n - s0, 0.9) * (0.5 - 0.05 * k), -0.6 + 0.24 * k)
    sparkle = highpass(r.standard_normal((n, 2)), 9000, 2) * asym_bell(t, hit + 0.25, 0.15, 0.6)[:, None] * 0.05
    dry = swell + stereo(sub + thud) + chord + bells * 0.5 + sparkle
    return dry + highpass(reverb(dry, t60=2.0, predelay=0.02, damp=8000, seed=112), 200, 2) * 0.4


# name: (fn, hit_s, peak_db, fade_in, fade_out, description)
KIT = {
    'whoosh': (whoosh, 0.45, -3, 0.01, 0.08, 'airy filtered-noise swoosh, L->R pan sweep; hit = loudest/brightest point'),
    'whoosh_short': (whoosh_short, 0.17, -4, 0.005, 0.04, 'quick swish for small elements'),
    'impact': (impact, 0.0, -1, 0.0005, 0.25, 'sub drop 55->35 Hz + punch + crack + noise tail + room'),
    'riser': (riser, 2.0, -2, 0.03, 0.006, 'noise + pitch-up build; hit = file end (cut)'),
    'reverse': (reverse, 1.2, -3, 0.05, 0.003, 'reversed cymbal swell; hit = file end'),
    'pop': (pop, 0.004, -6, 0.0005, 0.02, 'soft rounded bubble pop'),
    'click': (click, 0.0, -8, 0.0003, 0.01, 'crisp short tick'),
    'tick_soft': (tick_soft, 0.0, -15, 0.0003, 0.01, 'very soft key tick for text reveals'),
    'shimmer': (shimmer, 0.08, -4, 0.003, 0.25, 'F-pentatonic bell glitter; hit = main chime'),
    'glitch': (glitch, 0.0, -6, 0.001, 0.03, 'digital stutter / bitcrush burst'),
    'success': (success, 0.0, -5, 0.001, 0.12, 'two-note F5->C6 (fifth up) chime; 2nd note at 0.11 s'),
    'logo_sting': (logo_sting, 0.3, -1, 0.01, 0.4, 'reverse swell -> soft impact + bright Fmaj9 shimmer chord'),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    cues = {}
    print(f"{'name':<13} {'dur_s':>6} {'hit_s':>6} {'loudest_s':>9} {'peak':>7} {'rms':>7}")
    for name, (fn, hit, peak_db, fi, fo, desc) in KIT.items():
        x = finalize(fn(), peak_db=peak_db, fade_in=fi, fade_out=fo)
        write(OUT / f'{name}.wav', x)
        st = stats(x)
        assert st['finite'] and st['peak_dbfs'] <= -0.99, (name, st)
        win = max(1, n_of(0.01))
        loud = np.convolve(np.abs(x).max(axis=1), np.ones(win) / win, mode='same')
        cues[name] = {
            'file': f'sfx/{name}.wav',
            'duration_s': round(len(x) / SR, 4),
            'hit_s': hit,
            'peak_dbfs': st['peak_dbfs'],
            'rms_dbfs': st['rms_dbfs'],
            'description': desc,
        }
        print(f"{name:<13} {len(x) / SR:6.3f} {hit:6.3f} {np.argmax(loud) / SR:9.3f} {st['peak_dbfs']:7.2f} {st['rms_dbfs']:7.2f}")
    (OUT / 'cues.json').write_text(json.dumps(cues, indent=2), encoding='utf-8')
    print(f'wrote {len(cues)} files + cues.json to {OUT}')


if __name__ == '__main__':
    main()
