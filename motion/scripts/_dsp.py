"""Shared numpy-only DSP helpers for sfx.py and score.py (no scipy needed).

Filters are applied in the frequency domain (zero-phase, zero-padded FFT) using
analog biquad / Butterworth magnitude responses; time-varying filters crossfade
a small bank of static ones. Everything is deterministic given the seeds.
"""
import math

import numpy as np
import soundfile as sf

SR = 48000


def n_of(s):
    return int(round(s * SR))


def times(n):
    return np.arange(n) / SR


def rng(seed):
    return np.random.default_rng(seed)


def hz(m):
    return float(440.0 * 2.0 ** ((m - 69) / 12.0))


def _nfft(n):
    return 1 << max(1, int(math.ceil(math.log2(max(2, n)))))


# ---------------------------------------------------------------- filters
def fft_gain(x, gain_fn, pad=None):
    """Multiply the spectrum of x (n,) or (n, ch) by gain_fn(freqs)."""
    x = np.asarray(x, dtype=np.float64)
    n = x.shape[0]
    if pad is None:
        pad = max(8192, min(n, SR))
    nf = _nfft(n + 2 * pad)
    f = np.fft.rfftfreq(nf, 1.0 / SR)
    g = np.asarray(gain_fn(f))
    if x.ndim == 2:
        g = g[:, None]
    X = np.fft.rfft(x, nf, axis=0)
    return np.fft.irfft(X * g, nf, axis=0)[:n]


def mag_lp(f, fc, order=2, q=None):
    r = np.asarray(f) / float(fc)
    if q is None:
        return 1.0 / np.sqrt(1.0 + r ** (2 * order))
    g = 1.0 / np.sqrt((1.0 - r * r) ** 2 + (r / q) ** 2)
    if order > 2:
        g = g * mag_lp(f, fc, order - 2)
    return g


def mag_hp(f, fc, order=2, q=None):
    r = np.asarray(f) / float(fc)
    if q is None:
        ro = r ** order
        return ro / np.sqrt(1.0 + ro * ro)
    g = r * r / np.sqrt((1.0 - r * r) ** 2 + (r / q) ** 2)
    if order > 2:
        g = g * mag_hp(f, fc, order - 2)
    return g


def mag_bp(f, fc, q=1.0):
    r = np.asarray(f) / float(fc)
    return (r / q) / np.sqrt((1.0 - r * r) ** 2 + (r / q) ** 2)


def mag_bell(f, fc, db, width_oct=1.0):
    lf = np.log2(np.maximum(f, 1.0) / fc)
    return 10.0 ** (db / 20.0 * np.exp(-0.5 * (lf / width_oct) ** 2))


def lowpass(x, fc, order=2, q=None):
    return fft_gain(x, lambda f: mag_lp(f, fc, order, q))


def highpass(x, fc, order=2, q=None):
    return fft_gain(x, lambda f: mag_hp(f, fc, order, q))


def bandpass(x, fc, q=1.0):
    return fft_gain(x, lambda f: mag_bp(f, fc, q))


def _mag(kind, f, fc, q, order):
    if kind == 'lp':
        return mag_lp(f, fc, order, q)
    if kind == 'hp':
        return mag_hp(f, fc, order, q)
    if kind == 'bp':
        return mag_bp(f, fc, q if q else 1.0)
    raise ValueError(kind)


def sweep(x, curve, kind='lp', q=None, order=2, nbank=14):
    """Time-varying filter: curve = cutoff/centre in Hz per sample."""
    x = np.asarray(x, dtype=np.float64)
    n = x.shape[0]
    curve = np.broadcast_to(np.clip(np.asarray(curve, float), 20.0, SR * 0.45), (n,))
    lo, hi = float(curve.min()), float(curve.max())
    if hi / lo < 1.03:
        fc = math.sqrt(lo * hi)
        return fft_gain(x, lambda f: _mag(kind, f, fc, q, order))
    cs = np.geomspace(lo, hi, nbank)
    pos = np.interp(np.log(curve), np.log(cs), np.arange(nbank, dtype=float))
    y = np.zeros_like(x)
    pad = 4096
    for i, fc in enumerate(cs):
        w = np.clip(1.0 - np.abs(pos - i), 0.0, 1.0)
        nz = np.flatnonzero(w)
        if nz.size == 0:
            continue
        a, b = max(0, nz[0] - pad), min(n, nz[-1] + 1 + pad)
        seg = fft_gain(x[a:b], lambda f, fc=fc: _mag(kind, f, fc, q, order))
        ww = w[a:b]
        y[a:b] += seg * (ww[:, None] if x.ndim == 2 else ww)
    return y


# ------------------------------------------------------------ oscillators
def _phase(freq, n, phase0=0.0):
    freq = np.broadcast_to(np.asarray(freq, float), (n,))
    dt = freq / SR
    return phase0 + np.cumsum(dt) - dt, dt


def sine(freq, n, phase0=0.0):
    ph, _ = _phase(freq, n, phase0)
    return np.sin(2 * np.pi * ph)


def saw(freq, n, phase0=0.0):
    """Band-limited (PolyBLEP) sawtooth."""
    ph, dt = _phase(freq, n, phase0)
    ph = ph % 1.0
    y = 2.0 * ph - 1.0
    m = ph < dt
    if m.any():
        t = ph[m] / dt[m]
        y[m] -= t + t - t * t - 1.0
    m = ph > 1.0 - dt
    if m.any():
        t = (ph[m] - 1.0) / dt[m]
        y[m] -= t * t + t + t + 1.0
    return y


def adsr(n, a, d, s, r, gate):
    t = times(n)
    att = 0.5 - 0.5 * np.cos(np.pi * np.clip(t / max(a, 1e-4), 0, 1))
    dec = s + (1 - s) * np.exp(-np.maximum(t - a, 0) / max(d, 1e-4))
    rel = np.clip(1 - (t - gate) / max(r, 1e-4), 0, 1) ** 2
    return att * dec * rel


# ------------------------------------------------------------ stereo / fx
def stereo(x):
    x = np.asarray(x, dtype=np.float64)
    return np.stack([x, x], axis=1) if x.ndim == 1 else x


def pan(sig, p=0.0):
    """Equal-power pan, unity gain per side at centre."""
    a = (np.clip(np.asarray(p, float), -1, 1) + 1) * np.pi / 4
    return np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1) * math.sqrt(2)


def sat(x, drive=1.5):
    return np.tanh(x * drive) / np.tanh(drive)


def chorus(x, base_ms=14.0, depth_ms=3.5, rate=0.45, mix=0.45):
    x = stereo(x)
    n = len(x)
    idx = np.arange(n, dtype=float)
    t = idx / SR
    out = np.empty_like(x)
    for c in range(2):
        d = (base_ms + depth_ms * np.sin(2 * np.pi * rate * t + c * np.pi * 0.5 + 0.3)) * SR / 1000.0
        wet = np.interp(idx - d, idx, x[:, c], left=0.0)
        out[:, c] = x[:, c] * (1 - mix) + wet * mix
    return out


def pingpong(x, delay_s, fb=0.35, taps=6, lp=4500.0):
    x = stereo(x)
    mono = x.mean(axis=1)
    n = len(x)
    d = n_of(delay_s)
    out = np.zeros((n, 2))
    g = 1.0
    for k in range(1, taps + 1):
        g *= fb
        s = k * d
        if s >= n:
            break
        out[s:, k % 2] += mono[: n - s] * g
    return lowpass(out, lp, 2) if lp else out


def make_ir(t60=1.8, predelay=0.015, damp=7000.0, seed=11, length=None):
    L = n_of(length if length else t60 * 1.15)
    r = rng(seed)
    noise = r.standard_normal((L, 2))
    t = times(L)
    bright = lowpass(noise, damp, 2)
    dark = lowpass(noise, damp * 0.25, 2)
    bright /= bright.std() + 1e-12
    dark /= dark.std() + 1e-12
    m = np.clip(t / t60, 0, 1)[:, None]
    ir = (bright * (1 - m) + dark * m) * (10.0 ** (-3.0 * t / t60))[:, None]
    ir *= np.clip(t / 0.004, 0, 1)[:, None]
    ir = np.vstack([np.zeros((n_of(predelay), 2)), ir])
    return ir / math.sqrt(np.sum(ir ** 2) / 2.0)


def convolve(x, ir):
    x = stereo(x)
    n, m = len(x), len(ir)
    nf = _nfft(n + m)
    y = np.empty_like(x)
    for c in range(2):
        y[:, c] = np.fft.irfft(np.fft.rfft(x[:, c], nf) * np.fft.rfft(ir[:, c], nf), nf)[:n]
    return y


def reverb(x, t60=1.8, predelay=0.015, damp=7000.0, seed=11):
    return convolve(x, make_ir(t60, predelay, damp, seed))


def cymbal(dur, seed, decay=0.45, hp=4200.0):
    n = n_of(dur)
    t = times(n)
    r = rng(seed)
    noise = highpass(r.standard_normal((n, 2)), hp, 2)
    metal = np.zeros(n)
    for f0 in (3150.0, 4280.0, 5370.0, 6720.0, 8030.0, 9400.0, 11200.0):
        f = f0 * r.uniform(0.97, 1.03)
        metal += sine(f + 180.0 * sine(f * 1.41, n), n) * r.uniform(0.5, 1.0)
    env = np.exp(-t / decay) * (1 - np.exp(-t / 0.0008))
    x = (noise + 0.12 * stereo(metal)) * env[:, None]
    return lowpass(x, 13000, 2)


# ---------------------------------------------------------------- output
def finalize(x, peak_db=-1.0, fade_in=0.002, fade_out=0.01, hp=20.0):
    x = stereo(np.nan_to_num(np.asarray(x, dtype=np.float64)))
    if hp:
        x = highpass(x, hp, 2)
    x = x - x.mean(axis=0)
    n = len(x)
    fi = min(n // 2, max(2, n_of(fade_in)))
    fo = min(n // 2, max(2, n_of(fade_out)))
    x[:fi] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi)))[:, None]
    x[n - fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo)))[:, None]
    pk = np.max(np.abs(x))
    if pk > 0:
        x *= 10 ** (peak_db / 20.0) / pk
    return x


def db(x):
    return 20 * math.log10(max(float(x), 1e-12))


def stats(x):
    x = np.asarray(x)
    return {
        'peak_dbfs': round(db(np.max(np.abs(x))), 2),
        'rms_dbfs': round(db(np.sqrt(np.mean(x ** 2))), 2),
        'dc': float(np.abs(x.mean(axis=0)).max()),
        'finite': bool(np.isfinite(x).all()),
    }


def write(path, x):
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), np.asarray(x, dtype=np.float32), SR, subtype='FLOAT')
