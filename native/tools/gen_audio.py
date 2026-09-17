"""효과음·배경음악 WAV 생성 (웹 버전 WebAudio 합성과 같은 레시피).

사용법: python tools/gen_audio.py   → assets/sfx/*.wav, assets/bgm/*.wav
외부 오디오 파일 없이 사인·사각·삼각·톱니파와 필터링한 노이즈로 만든다.
"""
import math
import random
import struct
import wave
from pathlib import Path

SR = 22050
OUT = Path(__file__).resolve().parent.parent / "assets"
random.seed(7)


class Mix:
    def __init__(self, seconds):
        self.buf = [0.0] * int(SR * seconds)

    def add(self, i, v):
        if 0 <= i < len(self.buf):
            self.buf[i] += v


def osc(kind, phase):
    p = phase % 1.0
    if kind == "sine":
        return math.sin(2 * math.pi * p)
    if kind == "square":
        return 1.0 if p < 0.5 else -1.0
    if kind == "triangle":
        return 4 * p - 1 if p < 0.5 else 3 - 4 * p
    return 2 * p - 1  # sawtooth


def env(t, dur, vol):
    a = 0.008
    if t < a:
        return vol * (t / a)
    # 지수 감쇠: dur 시점에 약 -80dB
    return vol * math.exp(-9.2 * (t - a) / max(1e-3, dur - a))


def tone(m, freq, dur, kind="sine", vol=0.3, slide=0.0, delay=0.0):
    start = int(delay * SR)
    n = int((dur + 0.02) * SR)
    phase = 0.0
    for k in range(n):
        t = k / SR
        f = freq * (slide / freq) ** min(1.0, t / dur) if slide else freq
        phase += f / SR
        m.add(start + k, osc(kind, phase) * env(t, dur, vol))


class Biquad:
    def __init__(self):
        self.x1 = self.x2 = self.y1 = self.y2 = 0.0

    def run(self, x, kind, f, q):
        f = min(max(f, 20.0), SR * 0.45)
        w = 2 * math.pi * f / SR
        alpha = math.sin(w) / (2 * q)
        c = math.cos(w)
        if kind == "lowpass":
            b0, b1, b2 = (1 - c) / 2, 1 - c, (1 - c) / 2
        elif kind == "highpass":
            b0, b1, b2 = (1 + c) / 2, -(1 + c), (1 + c) / 2
        else:  # bandpass
            b0, b1, b2 = alpha, 0.0, -alpha
        a0, a1, a2 = 1 + alpha, -2 * c, 1 - alpha
        y = (b0 * x + b1 * self.x1 + b2 * self.x2 - a1 * self.y1 - a2 * self.y2) / a0
        self.x2, self.x1, self.y2, self.y1 = self.x1, x, self.y1, y
        return y


def noise(m, dur, vol=0.3, freq=1200, q=1.0, delay=0.0, kind="bandpass", slide=0.0):
    start = int(delay * SR)
    n = int((dur + 0.02) * SR)
    bq = Biquad()
    gain = 3.0 if kind == "bandpass" else 1.0
    for k in range(n):
        t = k / SR
        f = freq * (slide / freq) ** min(1.0, t / dur) if slide else freq
        v = bq.run(random.uniform(-1, 1), kind, f, q) * gain
        m.add(start + k, v * vol * math.exp(-9.2 * t / dur))


def write(path, samples, normalize=0.9):
    path.parent.mkdir(parents=True, exist_ok=True)
    peak = max(1e-6, max(abs(s) for s in samples))
    g = normalize / peak if peak > normalize else 1.0
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, math.tanh(s * g * 1.1))) * 32000)) for s in samples))


def semis(base, s):
    return base * 2 ** (s / 12)


SFX = {}


def sfx(name, seconds):
    def deco(fn):
        SFX[name] = (seconds, fn)
        return fn
    return deco


@sfx("click", 0.1)
def _(m): tone(m, 900, 0.06, "triangle", 0.2, 1300)
@sfx("pick", 0.1)
def _(m): tone(m, 600, 0.07, "triangle", 0.18, 900)
@sfx("drop", 0.12)
def _(m): tone(m, 420, 0.08, "triangle", 0.18, 260)
@sfx("merge", 0.45)
def _(m):
    b = 523
    tone(m, b, 0.18, "triangle", 0.3); tone(m, b * 1.5, 0.22, "sine", 0.22, delay=0.05); tone(m, b * 2, 0.3, "sine", 0.15, delay=0.1)
    noise(m, 0.15, 0.08, 6000, 2, kind="highpass")
@sfx("chain", 0.45)
def _(m):
    for i, s in enumerate([0, 4, 7, 12]):
        tone(m, semis(659, s), 0.2, "square", 0.08, delay=i * 0.045)
@sfx("produce", 0.35)
def _(m): noise(m, 0.12, 0.35, 2500, 3); tone(m, 1800, 0.25, "square", 0.06, 1400); tone(m, 220, 0.1, "sine", 0.3, 80)
@sfx("pop", 0.12)
def _(m): tone(m, 700, 0.08, "sine", 0.25, 1200)
@sfx("supply", 0.4)
def _(m): noise(m, 0.35, 0.12, 800, 1, slide=4000); tone(m, 400, 0.3, "sine", 0.12, 1200)
@sfx("equip", 0.45)
def _(m): tone(m, 784, 0.1, "square", 0.1); tone(m, 1047, 0.1, "square", 0.1, delay=0.07); tone(m, 1568, 0.25, "triangle", 0.15, delay=0.14)
@sfx("heal", 0.6)
def _(m):
    for i, s in enumerate([0, 4, 7, 11]):
        tone(m, semis(880, s), 0.35, "sine", 0.1, delay=i * 0.06)
@sfx("hit", 0.14)
def _(m): noise(m, 0.08, 0.3, 2000, 1.5); tone(m, 210, 0.08, "square", 0.1, 80)
@sfx("slash", 0.2)
def _(m): noise(m, 0.14, 0.25, 3000, 1, slide=900)
@sfx("crit", 0.3)
def _(m): noise(m, 0.2, 0.4, 1200, 1); tone(m, 160, 0.25, "sawtooth", 0.2, 50); tone(m, 1200, 0.15, "square", 0.08, 2400)
@sfx("arrow", 0.16)
def _(m): noise(m, 0.12, 0.12, 5000, 3, slide=2000)
@sfx("fire", 0.36)
def _(m): noise(m, 0.3, 0.2, 600, 1, kind="lowpass", slide=2500); tone(m, 200, 0.3, "sawtooth", 0.08, 400)
@sfx("boom", 0.7)
def _(m): noise(m, 0.6, 0.6, 400, 0.7, kind="lowpass", slide=60); tone(m, 90, 0.5, "sine", 0.6, 30)
@sfx("bigboom", 1.3)
def _(m): noise(m, 1.2, 0.8, 600, 0.5, kind="lowpass", slide=40); tone(m, 70, 1.0, "sine", 0.8, 25); noise(m, 0.4, 0.3, 4000, 1, delay=0.05, kind="highpass")
@sfx("zap", 0.35)
def _(m):
    for i in range(4):
        noise(m, 0.08, 0.3, 3000, 4, delay=i * 0.05); tone(m, random.uniform(800, 1600), 0.06, "sawtooth", 0.08, 200, delay=i * 0.05)
@sfx("enemyhit", 0.16)
def _(m): noise(m, 0.1, 0.25, 700, 1); tone(m, 120, 0.12, "square", 0.12, 60)
@sfx("die", 0.25)
def _(m): tone(m, 500, 0.2, "triangle", 0.15, 120); noise(m, 0.15, 0.15, 1500, 1)
@sfx("coin", 0.2)
def _(m): tone(m, 1319, 0.06, "square", 0.06); tone(m, 1760, 0.12, "square", 0.05, delay=0.05)
@sfx("meow", 0.4)
def _(m): tone(m, 700, 0.12, "sawtooth", 0.08, 1100); tone(m, 1100, 0.25, "sawtooth", 0.07, 600, delay=0.1)
@sfx("roar", 1.3)
def _(m): noise(m, 1.2, 0.6, 300, 0.8, kind="lowpass", slide=120); tone(m, 110, 1.1, "sawtooth", 0.25, 55); tone(m, 82, 1.1, "square", 0.12, 40)
@sfx("warn", 0.6)
def _(m):
    for d in (0, 0.2, 0.4):
        tone(m, 880, 0.12, "square", 0.15, delay=d)
@sfx("fever", 1.0)
def _(m):
    for i, s in enumerate([0, 4, 7, 12, 16, 19, 24]):
        tone(m, semis(523, s), 0.25, "square", 0.1, delay=i * 0.05)
    noise(m, 0.8, 0.2, 5000, 1, delay=0.1, kind="highpass")
@sfx("wave", 0.45)
def _(m): tone(m, 523, 0.15, "triangle", 0.2); tone(m, 784, 0.25, "triangle", 0.2, delay=0.12)
@sfx("star", 0.4)
def _(m): tone(m, 1047, 0.35, "triangle", 0.25); tone(m, 2093, 0.3, "sine", 0.1, delay=0.03)
@sfx("win", 1.2)
def _(m):
    for i, s in enumerate([0, 4, 7, 12, 7, 12, 16]):
        tone(m, semis(523, s), 0.28, "triangle", 0.2, delay=i * 0.11)
@sfx("lose", 1.2)
def _(m):
    for i, s in enumerate([7, 6, 5, 0]):
        tone(m, semis(392, s) / 1.5, 0.35, "triangle", 0.2, delay=i * 0.22)
@sfx("legend", 1.7)
def _(m):
    for i, s in enumerate([0, 7, 12, 16, 19, 24]):
        tone(m, semis(392, s), 0.6, "triangle", 0.15, delay=i * 0.09)
    noise(m, 1.5, 0.15, 7000, 1, kind="highpass")
@sfx("freeze", 0.5)
def _(m): tone(m, 2000, 0.4, "sine", 0.1, 3000); noise(m, 0.4, 0.2, 6000, 2)
@sfx("full", 0.35)
def _(m): tone(m, 200, 0.15, "square", 0.15); tone(m, 160, 0.2, "square", 0.15, delay=0.12)
@sfx("chest", 0.55)
def _(m): tone(m, 392, 0.1, "triangle", 0.2); tone(m, 523, 0.1, "triangle", 0.2, delay=0.08); tone(m, 784, 0.3, "triangle", 0.2, delay=0.16); noise(m, 0.3, 0.1, 6000, 1, delay=0.16, kind="highpass")


SONGS = {
    "lobby": dict(bpm=100, scale=[0, 2, 4, 7, 9], root=60, bass=[0, 0, 5, 7], mel=[0, 2, 4, 2, 7, 4, 2, 0, 4, 5, 7, 9, 7, 4, 2, -1], soft=True),
    "battle": dict(bpm=138, scale=[0, 2, 3, 5, 7, 8, 10], root=57, bass=[0, 0, 5, 3, 0, 0, 7, 5], mel=[0, 2, 4, 2, 4, 5, 4, 2, 0, -1, 4, 6, 7, 6, 4, 2], soft=False),
    "boss": dict(bpm=150, scale=[0, 1, 3, 5, 7, 8, 10], root=52, bass=[0, 0, 1, 0, 0, 0, 6, 5], mel=[0, -1, 0, 1, 4, -1, 3, 1, 0, -1, 0, 5, 4, 3, 1, -1], soft=False),
    "fever": dict(bpm=170, scale=[0, 2, 4, 7, 9], root=64, bass=[0, 3, 4, 3], mel=[0, 1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 6, 5, 4, 3, 2], soft=False),
}


def song(name, cfg, loops):
    step = 60 / cfg["bpm"] / 2
    steps = 16 * loops
    total = steps * step
    m = Mix(total + 1.0)

    def note(deg):
        sc = cfg["scale"]
        o, i = divmod(deg, len(sc))
        return 440 * 2 ** ((cfg["root"] + sc[i] + o * 12 - 69) / 12)

    for s in range(steps):
        t = s * step
        if s % 2 == 0:
            tone(m, note(cfg["bass"][(s // 2) % len(cfg["bass"])]) / 2, step * 1.8, "triangle", 0.35, delay=t)
        mel = cfg["mel"][s % len(cfg["mel"])]
        if mel >= 0:
            tone(m, note(mel + 7), step * 1.4, "sine" if cfg["soft"] else "square", 0.22 if cfg["soft"] else 0.07, delay=t)
        if not cfg["soft"]:
            if s % 4 == 0:
                tone(m, 120, 0.15, "sine", 0.5, 40, delay=t)
            if s % 4 == 2:
                noise(m, 0.08, 0.15, 2000, 0.7, delay=t, kind="highpass")
            if name in ("fever", "boss"):
                noise(m, 0.03, 0.06, 8000, 0.7, delay=t, kind="highpass")
    # 끝부분 잔향을 앞으로 감아 끊김 없는 루프로
    n = int(total * SR)
    buf = m.buf[:n]
    for k in range(n, len(m.buf)):
        buf[k - n] += m.buf[k]
    return buf


def main():
    for name, (seconds, fn) in SFX.items():
        m = Mix(seconds)
        fn(m)
        write(OUT / "sfx" / f"{name}.wav", m.buf)
    for name, cfg in SONGS.items():
        write(OUT / "bgm" / f"{name}.wav", [s * 0.55 for s in song(name, cfg, 4)], normalize=0.6)
    print(f"sfx {len(SFX)}개, bgm {len(SONGS)}개 → {OUT}")


if __name__ == "__main__":
    main()
