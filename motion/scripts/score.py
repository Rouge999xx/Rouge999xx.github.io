"""Timing-aware music score for the 'services' portfolio intro (pure numpy, no samples).

Usage: python scripts/score.py
  -> public/music/intro.wav            (48 kHz stereo float, exactly as long as the video)
  -> public/music/intro-sections.json  (scene starts, beat/bar grid, section + event times)

Reads src/timing.json["services"] and reproduces kit.tsx's frame maths:
  scene frames = ceil((LEAD + seconds + TAIL) * FPS), plus OUTRO on the last scene.
The tempo is chosen (~105 BPM) so a bar line lands exactly on the intro scene start
(the arrival) and on the cta scene start (the drop). The final chord lands on the
logo moment, OUTRO_LOGO seconds into the outro hold.

Style: warm lo-fi / tech electronic in F major, Fmaj9 - Am7 - Dm9 - Bbmaj9.
"""
import json
import math
import pathlib
import sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _dsp import (SR, n_of, times, rng, hz, fft_gain, lowpass, highpass, sweep, sine, saw, adsr,  # noqa: E402
                  stereo, sat, chorus, pingpong, make_ir, convolve, cymbal, mag_hp, mag_lp, mag_bell,
                  finalize, stats, write, db)

ROOT = pathlib.Path(__file__).resolve().parent.parent
VIDEO = 'services'
FPS, LEAD, TAIL = 30, 0.6, 0.7
OUTRO = 2.5        # extra hold added to the LAST scene (logo lockup)
OUTRO_LOGO = 0.4   # logo sting hit, seconds into the outro hold
TARGET_BPM = 105.0
SWING = 0.06       # off-8ths pushed late by this many beats
OUT_WAV = ROOT / 'public' / 'music' / 'intro.wav'
OUT_JSON = ROOT / 'public' / 'music' / 'intro-sections.json'

CHORDS = {  # pad voicing (MIDI), bass root (MIDI)
    'Fmaj9': ([53, 57, 60, 64, 67], 41),
    'Am7': ([52, 55, 57, 60, 64], 45),
    'Dm9': ([50, 53, 57, 60, 64], 38),
    'Bbmaj9': ([50, 53, 57, 60, 62], 34),
    'C7sus4': ([53, 55, 58, 60, 65], 36),
    'Fmaj9_end': ([53, 57, 60, 64, 67, 72], 41),
}
PROG = ['Fmaj9', 'Am7', 'Dm9', 'Bbmaj9']


# ------------------------------------------------------------------ timing
def load_scenes():
    lines = json.loads((ROOT / 'src' / 'timing.json').read_text(encoding='utf-8'))[VIDEO]
    scenes, frame = [], 0
    for i, l in enumerate(lines):
        last = i == len(lines) - 1
        fr = math.ceil((LEAD + l['seconds'] + TAIL + (OUTRO if last else 0)) * FPS)
        body = math.ceil((LEAD + l['seconds'] + TAIL) * FPS)
        scenes.append({
            'id': l['id'], 'start_frame': frame, 'frames': fr,
            'start_s': frame / FPS, 'end_s': (frame + fr) / FPS,
            'narration_start_s': frame / FPS + LEAD, 'narration_end_s': frame / FPS + LEAD + l['seconds'],
            'outro_start_frame': frame + body if last else None,
        })
        frame += fr
    return scenes, frame


# ------------------------------------------------------------------ voices
def place(buf, t0, sig, p=0.0, g=1.0):
    if sig.ndim == 1:
        sig = np.stack([sig * min(1.0, 1.0 - p), sig * min(1.0, 1.0 + p)], 1)
    s = int(round(t0 * SR))
    a = 0
    if s < 0:
        a, s = -s, 0
    if a >= len(sig) or s >= len(buf):
        return
    m = min(len(sig) - a, len(buf) - s)
    buf[s:s + m] += (sig[a:a + m] * g).astype(buf.dtype)


R = rng(2024)


def mk_kick(big):
    L = n_of(0.5)
    t = times(L)
    f = 45 + 105 * np.exp(-t / 0.03) + 50 * np.exp(-t / 0.005)
    body = sine(f, L) * np.exp(-t / (0.3 if big else 0.22)) * (1 - np.exp(-t / 0.0005))
    click = lowpass(R.standard_normal(L) * np.exp(-t / 0.0015), 4500, 2) * 0.3
    k = sat(body * 1.3 + click, 1.6)
    k[-480:] *= np.linspace(1, 0, 480)
    return k


def mk_clap(seed):
    r = rng(seed)
    L = n_of(0.35)
    t = times(L)
    env = np.zeros(L)
    for d in (0.0, 0.008, 0.017):
        s = n_of(d)
        env[s:] += np.exp(-(t[s:] - d) / 0.0035)
    s = n_of(0.024)
    env[s:] += 0.9 * np.exp(-(t[s:] - 0.024) / 0.11)
    noise = r.standard_normal((L, 2)) * 0.6 + r.standard_normal(L)[:, None] * 0.8
    x = highpass(lowpass(noise * env[:, None], 2400, 2), 650, 2)  # kept low-mid: narration lives at 1-4 kHz
    return x + stereo(sine(185.0, L) * np.exp(-t / 0.045) * 0.6)


def mk_snare(seed):
    r = rng(seed)
    L = n_of(0.25)
    t = times(L)
    body = sine(200 + 40 * np.exp(-t / 0.01), L) * np.exp(-t / 0.05)
    nz = highpass(r.standard_normal((L, 2)), 1800, 2) * np.exp(-t / 0.07)[:, None]
    return lowpass(stereo(body * 0.7) + nz * 0.6, 9000, 2)


def mk_hat(seed, decay):
    r = rng(seed)
    L = n_of(max(0.08, decay * 6))
    t = times(L)
    nz = r.standard_normal((L, 2)) * 0.5 + r.standard_normal(L)[:, None] * 0.7
    x = highpass(nz, 7000, 4) * (np.exp(-t / decay) * (1 - np.exp(-t / 0.0004)))[:, None]
    return lowpass(x, 15000, 2)


def mk_riser(dur, seed):
    L = n_of(dur)
    u = times(L) / dur
    return sweep(rng(seed).standard_normal((L, 2)), 400 * (10000 / 400) ** (u ** 1.3), 'bp', q=1.2) * (u ** 2)[:, None]


def mk_boom(dur=1.6):
    L = n_of(dur)
    t = times(L)
    return sat(sine(36 + 22 * np.exp(-t / 0.3), L) * (1 - np.exp(-t / 0.003)) * np.exp(-t / 0.6), 1.8)


_pluck_cache = {}


def pluck(m, dur, bright=1.0, hmax=4500.0, release=0.1):
    key = (m, round(dur, 3), bright, hmax)
    if key not in _pluck_cache:
        f = hz(m)
        L = n_of(dur + release)
        t = times(L)
        y = np.zeros(L)
        for k in range(1, max(1, min(18, int(hmax / f))) + 1):
            y += np.sin(2 * np.pi * k * f * t + 0.7 * k) / k * np.exp(-t * (3.0 + 6.0 * bright * (k - 1)))
        env = (1 - np.exp(-t / 0.002)) * np.clip(1 - (t - dur) / release, 0, 1)
        _pluck_cache[key] = y * env
    return _pluck_cache[key]


def lead_note(m, dur):
    f = hz(m)
    L = n_of(dur + 0.15)
    t = times(L)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.15) / 0.2, 0, 1)
    ph = np.cumsum(f * vib) / SR
    y = np.sin(2 * np.pi * ph) - np.sin(6 * np.pi * ph) / 9 + np.sin(10 * np.pi * ph) / 25 + 0.3 * np.sin(np.pi * ph)
    return y * adsr(L, 0.015, 0.3, 0.7, 0.15, dur)


_bass_cache = {}


def bass_note(m, dur, decay=None):
    key = (m, round(dur, 3), decay)
    if key not in _bass_cache:
        f = hz(m)
        L = n_of(dur + 0.06)
        t = times(L)
        y = np.zeros(L)
        for k in range(1, 9):
            y += np.sin(2 * np.pi * k * f * t) / k ** 1.4 * np.exp(-t * (k - 1) * 7.0)
        env = adsr(L, 0.004, 0.25, 0.75, 0.06, dur)
        if decay:
            env = env * np.exp(-t / decay)
        _bass_cache[key] = sat(y * env * 1.2, 1.5)
    return _bass_cache[key]


DET = [-17, -10, -4, 0, 4, 10, 17]
SPREAD = [-0.85, -0.55, -0.25, 0.0, 0.25, 0.55, 0.85]


def pad_chord(notes, gate, attack, release, seed):
    """Detuned 7-voice supersaw per note, spread across the stereo field."""
    L = n_of(gate + release)
    r = rng(seed)
    out = np.zeros((L, 2))
    for m in notes:
        for c, p in zip(DET, SPREAD):
            v = saw(hz(m) * 2 ** (c / 1200), L, r.random()) * (1.0 if c == 0 else 0.62)
            a = (p + 1) * np.pi / 4
            out[:, 0] += v * math.cos(a)
            out[:, 1] += v * math.sin(a)
    return out * (adsr(L, attack, 1.2, 0.85, release, gate) / (len(notes) * 3.0))[:, None]


def sidechain(kick_times, N, depth, release):
    kt = np.sort(np.asarray(kick_times, float))
    if kt.size == 0:
        return np.ones(N)
    t = np.arange(N) / SR
    idx = np.searchsorted(kt, t, side='right') - 1
    dt = np.where(idx >= 0, t - kt[np.maximum(idx, 0)], 1e9)
    rec = np.clip(dt / release, 0, 1)
    rec = rec * rec * (3 - 2 * rec)
    return 1 - depth * np.clip(dt / 0.004, 0, 1) * (1 - rec)


def active_rms(x, block=0.05, floor_db=-30.0):
    """RMS over the 50 ms blocks where the stem is actually playing (within floor_db of its loudest block)."""
    m = np.asarray(x, float)
    m = m.mean(axis=1) if m.ndim == 2 else m
    B = n_of(block)
    nblk = len(m) // B
    if nblk == 0:
        return float(np.sqrt(np.mean(m ** 2)))
    e = np.sqrt(np.mean(m[:nblk * B].reshape(nblk, B) ** 2, axis=1))
    act = e[e >= e.max() * 10 ** (floor_db / 20)]
    return float(np.sqrt(np.mean(act ** 2))) if act.size and e.max() > 0 else 0.0


def curve(keys, N, log=False):
    ts = np.maximum.accumulate(np.array([k[0] for k in keys], float))
    vs = np.array([k[1] for k in keys], float)
    t = np.arange(N) / SR
    return np.exp(np.interp(t, ts, np.log(vs))) if log else np.interp(t, ts, vs)


# ------------------------------------------------------------------ score
def main():
    scenes, total_frames = load_scenes()
    order = [s['id'] for s in scenes]
    S = {s['id']: s for s in scenes}
    for req in ('hook', 'intro', 'proof', 'approach', 'cta', 'contact'):
        assert req in S, f'timing.json[{VIDEO}] is missing scene {req!r}'
    total_s = total_frames / FPS
    N = total_frames * (SR // FPS)
    last = scenes[-1]
    outro_t = last['outro_start_frame'] / FPS
    logo_frame = last['outro_start_frame'] + round(OUTRO_LOGO * FPS)
    resolve_t = logo_frame / FPS

    # --- tempo grid: integer bars between intro (arrival) and cta (drop)
    origin = S['intro']['start_s']
    span = S['cta']['start_s'] - origin
    nb = max(1, round(span / (240 / TARGET_BPM)))
    bpm = 240 * nb / span
    while bpm > 112 and nb > 1:
        nb -= 1
        bpm = 240 * nb / span
    while bpm < 98:
        nb += 1
        bpm = 240 * nb / span
    beat = 60 / bpm
    bar = 4 * beat

    def bt(b):
        return origin + b * beat

    def bar_of(tsec):
        return 4 * int(round((tsec - origin) / bar))

    gid = order[order.index('intro') + 1]
    groove_b = max(4, bar_of(S[gid]['start_s']))
    proof_b = max(groove_b, bar_of(S['proof']['start_s']))
    approach_b = max(proof_b, bar_of(S['approach']['start_s']))
    cta_b = 4 * nb
    build_b = max(approach_b, cta_b - 4)
    approach_b = min(approach_b, build_b)
    contact_b = max(cta_b + 4, math.ceil((S['contact']['start_s'] - origin) / beat - 0.15))
    # 'hold': last bar line at least 3/4 bar before the logo -> sustained IV chord into the final I
    hold_b = 4 * math.floor((resolve_t - 0.75 * bar - origin) / bar)
    hold_b = max(hold_b, contact_b)
    hold_t = bt(hold_b)
    cta_bar, build_bar, approach_bar = cta_b // 4, build_b // 4, approach_b // 4

    def section(b):
        if b < 0:
            return 'hook'
        if b < groove_b:
            return 'intro'
        if b < proof_b:
            return 'groove'
        if b < approach_b:
            return 'proof'
        if b < build_b:
            return 'break'
        if b < cta_b:
            return 'build'
        if b < contact_b:
            return 'drop'
        if b < hold_b:
            return 'contact'
        if bt(b) < resolve_t - 1e-6:
            return 'hold'
        return 'outro'

    def chord_for_bar(k):
        if k < 0:
            return 'C7sus4' if k == -1 else ('Bbmaj9' if k % 2 == 0 else 'Dm9')
        if k >= cta_bar:
            return PROG[(k - cta_bar) % 4]
        if k >= build_bar:
            return 'C7sus4'
        if k >= approach_bar:
            return PROG[(k - approach_bar) % 4]
        return PROG[k % 4]

    # --- chord events [start, end, name]
    events = []
    k = math.floor((0 - origin) / bar)
    while origin + k * bar < hold_t - 1e-6:
        t0, t1 = origin + k * bar, min(origin + (k + 1) * bar, hold_t)
        name = chord_for_bar(k)
        if events and events[-1][2] == name:
            events[-1][1] = t1
        else:
            events.append([max(0.0, t0), t1, name])
        k += 1
    hold_name = 'Bbmaj9' if events[-1][2] != 'Bbmaj9' else 'C7sus4'
    events.append([hold_t, resolve_t, hold_name])
    events.append([resolve_t, total_s, 'Fmaj9_end'])

    hum = rng(7)

    def H(v, s=0.07):
        return float(np.clip(v * (1 + s * hum.standard_normal()), 0.05, 1.2))

    def J(sd=0.003):
        return float(hum.normal(0, sd))

    f32 = np.float32
    stems = {k: np.zeros((N, 2), f32) for k in ('kick', 'perc', 'hats', 'bass', 'pad', 'keys', 'lead', 'fx')}
    kick_n, kick_b = mk_kick(False), mk_kick(True)
    claps = [mk_clap(300 + i) for i in range(4)]
    snares = [mk_snare(400 + i) for i in range(3)]
    hats_c = [mk_hat(500 + i, 0.03) for i in range(6)]
    hats_o = [mk_hat(600 + i, 0.2) for i in range(3)]
    kick_times = []

    def kick(t, v, big=False):
        place(stems['kick'], t, kick_b if big else kick_n, g=H(v, 0.04))
        kick_times.append(t)

    def hat(t, v, open_=False):
        bank = hats_o if open_ else hats_c
        place(stems['hats'], t + J(0.003), bank[int(hum.integers(len(bank)))], g=H(v, 0.12))

    def clap(t, v):
        place(stems['perc'], t + J(0.002), claps[int(hum.integers(len(claps)))], g=H(v, 0.06))

    # --- drums, beat by beat
    b_first = math.floor((0 - origin) / beat)
    b_last = math.ceil((total_s - origin) / beat)
    for b in range(b_first, b_last + 1):
        sec = section(b)
        pos = b % 4
        t = bt(b)
        if t >= total_s:
            break
        off8 = bt(b + 0.5 + SWING)
        if sec == 'hook':
            if b >= -4:  # last bar of the hook: rising 16th ticks
                for j in range(4):
                    hat(bt(b + j / 4), 0.1 + 0.35 * (b + 4 + j / 4) / 4)
        elif sec == 'intro':
            if pos in (0, 2):
                kick(t, 0.95 if pos == 0 else 0.85)
            if pos == 2 and (b // 4) % 2 == 1:
                kick(bt(b + 0.5), 0.5)
            hat(t, 0.35)
            hat(off8, 0.55)
        elif sec in ('groove', 'proof', 'drop'):
            if sec == 'drop':
                kick(t, 1.0 if pos == 0 else 0.9, big=True)
            else:
                if pos in (0, 2):
                    kick(t, 1.0 if pos == 0 else 0.9)
                if pos == 2:
                    kick(bt(b + 0.5), 0.55)
            if pos in (1, 3):
                clap(t, 0.9 if sec != 'drop' else 1.0)
            hat(t, 0.4)
            if sec != 'groove' and pos == 3:
                hat(off8, 0.5, open_=True)
            else:
                hat(off8, 0.6)
            if sec != 'groove':
                hat(bt(b + 0.25 + SWING / 2), 0.18)
                hat(bt(b + 0.75 + SWING / 2), 0.2)
        elif sec == 'break':
            hat(t, 0.3)
            hat(off8, 0.45)
            if pos == 3 and ((b - approach_b) // 4) % 2 == 1:
                hat(off8, 0.25, open_=True)
        elif sec == 'build':
            for j in range(4):
                x = b + j / 4
                if x < cta_b - 0.25:
                    hat(bt(x), 0.25 + 0.5 * (x - build_b) / max(1, cta_b - build_b))
        elif sec == 'contact':  # drums thin out: kick on 1, soft hats, no clap
            if pos == 0:
                kick(t, 0.8)
            hat(t, 0.25)
            hat(off8, 0.38)
        elif sec == 'hold':  # just a fading tick under the sustained chord
            hat(t, 0.22 * max(0.2, 1 - (b - hold_b) / 6))

    # snare roll into the drop: 8ths -> 16ths -> 32nds, rising
    x = build_b
    L4 = max(1, cta_b - build_b)
    i = 0
    while x < cta_b - 0.25 - 1e-9:
        p = (x - build_b) / L4
        place(stems['perc'], bt(x), snares[i % 3], g=0.25 + 0.75 * p ** 1.5)
        x += 0.5 if p < 0.5 else (0.25 if p < 0.75 else 0.125)
        i += 1

    # --- fx: crashes, reverse swells, risers, sub booms
    crash = cymbal(2.6, 700, decay=0.85, hp=3200)
    rev = cymbal(1.4, 701, decay=0.5)[::-1].copy()
    boom = mk_boom()
    fx = stems['fx']
    for tt, g in ((bt(0), 0.7), (bt(cta_b), 0.9)):
        place(fx, tt, crash, g=g)
        place(fx, tt - len(rev) / SR, rev, g=0.8)
        place(fx, tt, stereo(boom), g=0.9)
    place(fx, bt(0) - bar, mk_riser(bar, 710), g=0.6)
    place(fx, bt(cta_b) - bar, mk_riser(bar, 711), g=0.8)
    place(fx, resolve_t - len(rev) / SR, rev, g=0.35)          # gentle swell into the logo chord
    place(fx, resolve_t, stereo(boom), g=0.35)                 # soft sub under the logo (sting has its own hit)

    # --- bass
    INTRO_PAT = [(0.0, 1.9, 0, 1.0), (2.0, 1.3, 0, 0.85), (3.5, 0.45, 12, 0.55)]
    GROOVE_PAT = [(0.0, 1.3, 0, 1.0), (1.5, 0.45, 0, 0.7), (2.5, 0.45, 12, 0.65), (3.0, 0.9, 0, 0.85)]
    DROP_PAT = [(0.0, 0.9, 0, 1.0), (1.0, 0.4, 0, 0.6), (1.5, 0.45, 0, 0.75), (2.5, 0.45, 12, 0.7),
                (3.0, 0.45, 0, 0.85), (3.5, 0.4, 12, 0.65)]
    pats = {'intro': INTRO_PAT, 'groove': GROOVE_PAT, 'proof': GROOVE_PAT, 'drop': DROP_PAT, 'contact': INTRO_PAT}
    for k in range(0, math.ceil((hold_t - origin) / bar) + 1):
        root = CHORDS[chord_for_bar(k)][1]
        for off, dur, semi, v in pats.get(section(4 * k), []):
            st = bt(4 * k + off)
            if st >= hold_t - 0.05 or section(4 * k + off) not in pats:
                continue
            d = min(dur * beat, hold_t - st - 0.02)
            place(stems['bass'], st + J(0.002), bass_note(root + semi, round(d, 3)), g=H(v, 0.05))
    place(stems['bass'], hold_t, bass_note(CHORDS[hold_name][1], round(resolve_t - hold_t - 0.03, 3)), g=0.55)
    place(stems['bass'], resolve_t, bass_note(41, round(total_s - resolve_t, 3), decay=1.1), g=0.85)

    # --- arp (keys) + hook pulse
    ARP = [0, 2, 4, 2, 1, 3, 4, 3]
    arp_v = {'groove': 0.5, 'proof': 0.6, 'drop': 0.7, 'break': 0.42, 'contact': 0.4}
    for k in range(0, math.ceil((hold_t - origin) / bar) + 1):
        notes = CHORDS[chord_for_bar(k)][0]
        for e in range(8):
            bb = 4 * k + e / 2 + (SWING if e % 2 else 0)
            sec = section(4 * k + e / 2)
            st = bt(bb)
            if st >= hold_t - 0.05:
                continue
            if sec == 'build':
                v = 0.35 + 0.4 * (4 * k + e / 2 - build_b) / L4
                if 4 * k + e / 2 >= cta_b - 0.25:
                    continue
            elif sec in arp_v:
                v = arp_v[sec] * (1.0 if e % 2 == 0 else 0.82)
            else:
                continue
            bright = 0.6 if sec in ('break', 'contact') else 1.0
            m = notes[ARP[e] % len(notes)] + 12
            place(stems['keys'], st + J(0.003), pluck(m, 0.22, bright), p=0.35 if e % 2 else -0.35, g=H(v))
    for e in range(2 * b_first, 0):  # hook: soft 8th-note pulse on the root, opening with the filter
        st = bt(e / 2)
        if st < 0:
            continue
        root = CHORDS[chord_for_bar(math.floor(e / 8))][1] + 24
        v = (0.3 + 0.5 * st / origin) * (1.0 if e % 2 == 0 else 0.6)
        place(stems['keys'], st, pluck(root + (12 if e % 2 else 0), 0.16, 0.7, 1800), p=0.2 if e % 2 else -0.2, g=v)
    for i, m in enumerate(sorted(CHORDS['Fmaj9_end'][0])[1:5]):  # sparse rising notes after the logo hit
        place(stems['keys'], resolve_t + 0.5 + i * beat, pluck(m + 12, 0.6, 0.4), p=-0.4 + 0.27 * i, g=0.35 * 0.8 ** i)

    # --- lead / countermelody (proof + drop)
    PHR_A = [(0.0, -1, 1.4), (1.5, -2, 0.9), (2.5, -3, 0.45), (3.0, -2, 0.9)]
    PHR_B = [(0.5, -3, 0.45), (1.0, -2, 0.9), (2.0, -1, 1.8)]
    for k in range(0, math.ceil((hold_t - origin) / bar) + 1):
        sec = section(4 * k)
        if sec not in ('proof', 'drop'):
            continue
        first = proof_b // 4 if sec == 'proof' else cta_bar
        notes = sorted(CHORDS[chord_for_bar(k)][0])
        for off, idx, dur in (PHR_A if (k - first) % 2 == 0 else PHR_B):
            st = bt(4 * k + off)
            if section(4 * k + off) != sec:
                continue
            place(stems['lead'], st + J(0.004), lead_note(notes[idx] + 12, dur * beat), g=H(0.8 if sec == 'drop' else 0.65))

    # --- pads
    for i, (t0, t1, name) in enumerate(events):
        if name == 'Fmaj9_end':
            gate = max(0.3, total_s - 1.3 - t0)
            sig = pad_chord(CHORDS[name][0], gate, 0.06, 1.2, 900 + i)
        else:
            attack = 1.6 if t0 <= 0 else (0.5 if name == hold_name and t0 >= hold_t - 1e-6 else 0.12)
            sig = pad_chord(CHORDS[name][0], t1 - t0, attack, 0.6, 900 + i)
        place(stems['pad'], t0, sig)

    # --- processing
    T = np.arange(N) / SR
    gap_t0, gap_t1 = bt(cta_b - 0.25), bt(cta_b)  # pre-drop air gap
    gap = np.ones(N)
    gap -= np.clip((T - (gap_t0 - 0.008)) / 0.008, 0, 1) * np.clip((gap_t1 - T) / 0.003, 0, 1)

    pad = chorus(stems['pad'].astype(np.float64), 14, 3.5, 0.35, 0.4)
    cut = curve([(0, 320), (origin * 0.6, 700), (origin - 0.05, 2300), (origin, 1900), (bt(groove_b), 1700),
                 (bt(proof_b), 2100), (bt(approach_b) - 0.01, 2100), (bt(approach_b) + bar * 0.5, 1100),
                 (bt(build_b), 1100), (gap_t1 - 0.01, 4200), (gap_t1, 2600), (hold_t, 2400),
                 (resolve_t, 1600), (resolve_t + 0.05, 2600), (total_s, 900)], N, log=True)
    pad = sweep(pad, cut, 'lp', q=0.9, order=4)
    lvl = curve([(0, 0.8), (origin, 1.0), (bt(groove_b), 0.85), (bt(approach_b), 1.0), (gap_t1, 0.9),
                 (hold_t, 1.0), (total_s, 1.0)], N)
    pump = sidechain(kick_times, N, 0.55, 0.8 * beat)
    pad *= (pump * lvl)[:, None]
    keys = stems['keys'].astype(np.float64) * sidechain(kick_times, N, 0.25, 0.6 * beat)[:, None]
    bass = stems['bass'].astype(np.float64) * sidechain(kick_times, N, 0.3, 0.45 * beat)[:, None]
    lead = stems['lead'].astype(np.float64)
    lead = lowpass(lead + pingpong(lead, 0.75 * beat, 0.35, 5, 3500), 3200, 2)
    mixer = {  # stem: (signal, target active-RMS dBFS, reverb send)
        'kick': (stems['kick'].astype(np.float64), -17, 0.0),
        'perc': (stems['perc'].astype(np.float64), -26, 0.22),
        'hats': (stems['hats'].astype(np.float64), -32, 0.06),
        'bass': (lowpass(bass, 900, 2), -19.5, 0.0),
        'pad': (pad, -19, 0.28),
        'keys': (lowpass(keys, 3500, 2), -25, 0.32),
        'lead': (lead, -27, 0.35),
        'fx': (stems['fx'].astype(np.float64), -24, 0.3),
    }
    dry = np.zeros((N, 2))
    send = np.zeros((N, 2))
    for name, (sig, target, snd) in mixer.items():
        rms = active_rms(sig)
        if rms <= 0:
            continue
        s = sig * (10 ** (target / 20) / rms) * gap[:, None]
        dry += s
        send += s * snd
    wet = convolve(send, make_ir(2.2, 0.025, 6500, 77))
    wet = fft_gain(wet, lambda f: mag_hp(f, 200, 2) * mag_lp(f, 7000, 2))
    mix = dry + 0.6 * wet
    # master EQ: rumble cut, warm low bump, wide 2 kHz scoop to leave room for narration
    mix = fft_gain(mix, lambda f: mag_hp(f, 28, 2) * mag_bell(f, 70, 1.5, 0.8) * mag_bell(f, 2000, -4.5, 1.0))
    mix /= np.max(np.abs(mix))
    mix = sat(mix, 1.4)  # glue
    mix = finalize(mix, peak_db=-1.0, fade_in=0.01, fade_out=1.2, hp=25)
    assert mix.shape == (N, 2)
    write(OUT_WAV, mix)

    # --- report + grid json
    secs = [('hook', 0.0, bt(0)), ('intro', bt(0), bt(groove_b)), ('groove', bt(groove_b), bt(proof_b)),
            ('proof', bt(proof_b), bt(approach_b)), ('break', bt(approach_b), bt(build_b)),
            ('build', bt(build_b), bt(cta_b)), ('drop', bt(cta_b), bt(contact_b)),
            ('contact', bt(contact_b), hold_t), ('hold', hold_t, resolve_t), ('outro', resolve_t, total_s)]
    desc = {
        'hook': 'filtered pad (Dm9/Bbmaj9 -> C7sus4) + 8th pulse, low-pass opening, ticks + riser + reverse into downbeat',
        'intro': 'arrival on Fmaj9: crash + sub boom, kick on 1 & 3, bass, full pumped pad, swung hats',
        'groove': 'steady groove: kick, clap on 2 & 4, swung hats, sidechained pad, pluck arp, bass',
        'proof': 'fuller: + lead countermelody (ping-pong delay), 16th ghost hats, open hats',
        'break': 'breakdown: hats + darker pad + soft arp, no kick/bass',
        'build': 'C7sus4 bar: snare roll 8ths->16ths->32nds, rising hats/arp, riser, filter sweep, 1/16 air gap',
        'drop': 'cta drop: four-on-the-floor, claps, busier bass, brighter pad, lead, crash + boom',
        'contact': 'drums thin out: kick on 1, soft hats, simple bass, darker arp',
        'hold': f'{hold_name} held (IV) with fading ticks and a soft reverse swell into the logo',
        'outro': 'Fmaj9 resolves on the logo hit, sparse rising plucks, rings out to the video end',
    }
    print(f'video={VIDEO} total_frames={total_frames} total_s={total_s:.4f} samples={N} (wav {len(mix)})')
    print(f'BPM={bpm:.3f} beat={beat:.4f}s bar={bar:.4f}s, bar 0 = intro start {origin:.4f}s, {nb} bars to the drop')
    print('scene starts:')
    for s in scenes:
        print(f"  {s['id']:<11} frame {s['start_frame']:>5}  {s['start_s']:8.4f}s  ({s['frames']} frames)")
    print(f'outro hold starts {outro_t:.4f}s, logo hit / final chord at {resolve_t:.4f}s (frame {logo_frame})')
    print('sections:')
    for name, a, b2 in secs:
        seg = mix[max(0, n_of(a)):n_of(b2)]
        r = db(np.sqrt(np.mean(seg ** 2))) if len(seg) else float('nan')
        print(f'  {name:<8} {a:8.3f} -> {b2:8.3f}s  rms {r:6.1f} dBFS')
    st = stats(mix)
    print('master:', st)

    beats = []
    for b in range(b_first, b_last + 1):
        tb = bt(b)
        if 0 <= tb < total_s:
            beats.append({'t': round(tb, 4), 'frame': round(tb * FPS, 2), 'bar': b // 4, 'beat': b % 4})
    bars = []
    for k in range(math.floor(-origin / bar), math.ceil((total_s - origin) / bar)):
        tb = bt(4 * k)
        if 0 <= tb < total_s:
            name = next((e[2] for e in events if e[0] <= tb < e[1]), events[-1][2])
            bars.append({'index': k, 't': round(tb, 4), 'frame': round(tb * FPS, 2), 'chord': name, 'section': section(4 * k)})
    data = {
        'video': VIDEO, 'fps': FPS, 'sample_rate': SR, 'file': 'music/intro.wav',
        'total_frames': total_frames, 'total_s': total_s,
        'bpm': round(bpm, 4), 'beat_s': round(beat, 6), 'bar_s': round(bar, 6), 'beats_per_bar': 4,
        'swing_beats': SWING, 'grid_origin_s': round(origin, 6),
        'grid_note': 'bar 0 beat 0 = intro scene start; beat time = grid_origin_s + (4*bar + beat) * beat_s',
        'key': 'F major', 'progression': PROG,
        'scenes': scenes,
        'sections': [{'name': n, 'start_s': round(a, 4), 'end_s': round(b2, 4), 'description': desc[n]} for n, a, b2 in secs],
        'events': {
            'arrival_downbeat_s': round(bt(0), 4), 'build_start_s': round(bt(build_b), 4),
            'air_gap_s': round(gap_t0, 4), 'drop_s': round(bt(cta_b), 4), 'hold_s': round(hold_t, 4),
            'outro_start_s': round(outro_t, 4), 'logo_resolve_s': round(resolve_t, 4), 'logo_resolve_frame': logo_frame,
        },
        'chords': [{'start_s': round(a, 4), 'end_s': round(b2, 4), 'chord': c} for a, b2, c in events],
        'kicks_s': [round(t, 4) for t in sorted(kick_times) if 0 <= t < total_s],
        'bars': bars, 'beats': beats,
    }
    OUT_JSON.write_text(json.dumps(data, indent=1), encoding='utf-8')
    print(f'wrote {OUT_WAV.relative_to(ROOT)} and {OUT_JSON.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
