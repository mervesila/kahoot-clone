#!/usr/bin/env python3
"""Kahoot tarzı ORİJİNAL (telifsiz) müzik ve ses efektlerini üretir.

WAV üretir ve macOS afconvert ile .m4a (AAC) olarak public/audio klasörüne yazar.
Tamamı bu script içinde sentezlenen özgün kompozisyonlardır (hiçbir hazır kayıt kullanılmaz).

Kullanım:
    python3 scripts/generate_audio.py
"""
import numpy as np
import os
import subprocess
import wave

SR = 44100

OUT_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'public', 'audio'))
TMP_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '.audio_tmp'))

NOTE_INDEX = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
}


def freq(note: str) -> float:
    name = note[:-1]
    octave = int(note[-1])
    semitones = NOTE_INDEX[name] + (octave + 1) * 12
    return 440.0 * (2 ** ((semitones - 69) / 12))


def env(n: int, attack: float = 0.01, release: float = 0.05) -> np.ndarray:
    e = np.ones(n)
    a = int(SR * attack)
    r = int(SR * release)
    if a > 0 and a < n:
        e[:a] = np.linspace(0, 1, a)
    if r > 0 and r < n:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def phase_fm(f: float, dur: float, vibrato: float = 0.0, vrate: float = 6.0) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n) / SR
    if vibrato:
        finst = f * (1 + vibrato * np.sin(2 * np.pi * vrate * t))
    else:
        finst = np.full(n, f)
    return 2 * np.pi * np.cumsum(finst) / SR


def tone(f: float, dur: float, wave_type: str = 'saw', volume: float = 0.5,
         attack: float = 0.01, release: float = 0.05, vibrato: float = 0.0) -> np.ndarray:
    n = int(SR * dur)
    if n <= 0:
        return np.zeros(0)
    ph = phase_fm(f, dur, vibrato)
    if wave_type == 'saw':
        x = 2 * (ph % (2 * np.pi)) / (2 * np.pi) - 1
    elif wave_type == 'square':
        x = np.sign(np.sin(ph))
    elif wave_type == 'triangle':
        x = 2 * np.abs(2 * (ph % (2 * np.pi)) / (2 * np.pi) - 1) - 1
    else:
        x = np.sin(ph)
    return volume * x * env(n, attack, release)


def kick(dur: float = 0.16, f0: float = 130, f1: float = 45, volume: float = 0.9) -> np.ndarray:
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = np.linspace(f0, f1, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return volume * np.sin(ph) * env(n, 0.002, 0.12)


def noise(dur: float, volume: float = 0.3) -> np.ndarray:
    n = int(SR * dur)
    x = np.random.randn(n)
    x = np.diff(np.concatenate(([0], x)))
    return volume * x * env(n, 0.001, 0.03)


def put(buf: np.ndarray, t0: float, chunk: np.ndarray) -> None:
    i0 = int(t0 * SR)
    i1 = min(i0 + len(chunk), len(buf))
    if i0 >= len(buf):
        return
    buf[i0:i1] += chunk[: i1 - i0]


def normalize(buf: np.ndarray) -> np.ndarray:
    peak = max(1e-9, float(np.max(np.abs(buf))))
    return np.tanh(buf * (0.9 / peak))


def write_wav(path: str, data: np.ndarray) -> None:
    pcm = (np.clip(data, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def to_m4a(wav_path: str, name: str) -> None:
    out_path = os.path.join(OUT_DIR, f'{name}.m4a')
    cmd = ['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '128000', wav_path, out_path]
    subprocess.run(cmd, check=True, capture_output=True)
    print(f'  -> {out_path}')


# ---------------------------------------------------------------- compositions

def build_lobby() -> np.ndarray:
    beat = 60 / 128
    total = 16 * beat + 0.2
    buf = np.zeros(int(SR * total))
    prog = [
        (['A3', 'C4', 'E4'], 'A2'),   # Am
        (['F3', 'A3', 'C4'], 'F2'),   # F
        (['G3', 'C4', 'E4'], 'C3'),   # C
        (['G3', 'B3', 'D4'], 'G2'),   # G
    ]
    step = beat / 4
    for bar in range(4):
        tones, root = prog[bar]
        bar_start = bar * 4 * beat
        for e in range(8):
            t0 = bar_start + e * (beat / 2)
            put(buf, t0, tone(freq(root), beat * 0.95, 'saw', volume=0.5, attack=0.005, release=beat * 0.8))
        pattern = [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 2, 1, 2]
        for i in range(16):
            f = freq(tones[pattern[i]]) * 2
            put(buf, bar_start + i * step, tone(f, step * 0.95, 'triangle', volume=0.3, attack=0.004, release=step * 0.8))
        put(buf, bar_start, kick())
        put(buf, bar_start + 2 * beat, kick())
        for e in range(8):
            if e % 2 == 1:
                put(buf, bar_start + e * (beat / 2), noise(0.05, volume=0.1))
    return normalize(buf)


def build_countdown() -> np.ndarray:
    total = 30.0
    buf = np.zeros(int(SR * total))
    for sec in range(30):
        put(buf, sec, tone(880 + sec * 18, 0.06, 'square', volume=0.22, attack=0.002, release=0.03))
        put(buf, sec, kick(0.18, 110, 55, volume=0.5))
        put(buf, sec + 0.5, tone(300 + sec * 6, 0.05, 'triangle', volume=0.14, attack=0.002, release=0.03))
    for i in range(12):
        put(buf, 27 + i * 0.25, tone(950 + i * 45, 0.045, 'square', volume=0.3, attack=0.002, release=0.02))
    put(buf, 29.4, tone(freq('C6'), 0.8, 'triangle', volume=0.4, attack=0.01, release=0.6))
    return normalize(buf)


def build_correct() -> np.ndarray:
    dur = 1.7
    buf = np.zeros(int(SR * dur))
    notes = [freq('C5'), freq('E5'), freq('G5'), freq('C6')]
    for i, f in enumerate(notes):
        put(buf, i * 0.12, tone(f, 0.5, 'triangle', volume=0.5, attack=0.005, release=0.3))
    for f in notes:
        put(buf, 0.5, tone(f, 1.0, 'saw', volume=0.16, attack=0.005, release=0.9))
    return normalize(buf)


def build_wrong() -> np.ndarray:
    dur = 1.6
    buf = np.zeros(int(SR * dur))
    n = int(SR * 0.7)
    t = np.arange(n) / SR
    f = 300 * np.exp(-t * 2.0) + 90
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.06 * np.sin(2 * np.pi * 6 * t))) / SR
    buf[:n] += 0.5 * np.sign(np.sin(ph)) * env(n, 0.01, 0.3)
    put(buf, 0.72, tone(freq('G2'), 0.5, 'square', volume=0.32, attack=0.02, release=0.4))
    return normalize(buf)


def build_victory() -> np.ndarray:
    buf = np.zeros(int(SR * 8.2))
    prog = [
        ([freq('C4'), freq('E4'), freq('G4')], 0.0),
        ([freq('F4'), freq('A4'), freq('C5')], 2.0),
        ([freq('G4'), freq('B4'), freq('D5')], 4.0),
        ([freq('C5'), freq('E5'), freq('G5')], 6.0),
    ]
    for tones, t0 in prog:
        put(buf, t0, noise(0.5, volume=0.07))
        for i, f in enumerate(tones):
            put(buf, t0 + i * 0.05, tone(f, 1.9, 'saw', volume=0.2, attack=0.05, release=1.4))
        run = tones * 2 + [tones[0], tones[1]]
        for i, f in enumerate(run):
            put(buf, t0 + 0.95 + i * 0.08, tone(f, 0.35, 'square', volume=0.22, attack=0.004, release=0.2))
    return normalize(buf)


def build_tick() -> np.ndarray:
    buf = np.zeros(int(SR * 0.2))
    put(buf, 0.0, tone(1500, 0.08, 'square', volume=0.35, attack=0.002, release=0.05))
    return normalize(buf)


BUILDERS = {
    'lobby': build_lobby,
    'countdown': build_countdown,
    'correct': build_correct,
    'wrong': build_wrong,
    'victory': build_victory,
    'tick': build_tick,
}


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(TMP_DIR, exist_ok=True)
    for name, builder in BUILDERS.items():
        print(f'* {name}')
        wav = os.path.join(TMP_DIR, f'{name}.wav')
        write_wav(wav, builder())
        to_m4a(wav, name)
    print('OK: tüm ses dosyaları public/audio altına yazıldı.')


if __name__ == '__main__':
    main()
