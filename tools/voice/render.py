"""
Pebble's voice: renders every line it says to public/media/voice/<id>.mp3.

A clear American voice (Kokoro, af_heart), made small and young by raising its
pitch and formants together, then given a little robot: a doubled copy a hair
sharp, a short metallic resonance, a faint buzz. Each step is mild on its own;
together they read as a cute robot while every word stays clear. (Stacked any
harder, "Pebble" starts to come out as "Tabble".)

Kokoro is Apache-2.0, so the clips are ours to ship. Setup, once:

  uv venv --python 3.12 .voice-venv
  uv pip install --python .voice-venv/bin/python kokoro-onnx "misaki[en]" soundfile numpy scipy lameenc pip
  .voice-venv/bin/python -m spacy download en_core_web_sm
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin

Then: .voice-venv/bin/python tools/voice/render.py <folder with the two model files>

A line changed in lib/voice.ts must be rendered again here; tests/voice.test.ts
fails until every line has its clip.
"""
import os, sys
import numpy as np, lameenc
from scipy import signal
from kokoro_onnx import Kokoro
from misaki import en

# Same text as LINES in lib/voice.ts.
LINES = {
    'hello': 'Hi! I’m Pebble!',
    'timer': 'On it! Five minutes, starting now!',
    'rain': 'Ooh, it’ll rain this evening! Don’t forget your umbrella!',
    'plan-day': 'Let’s start with one thing that matters most. Give it your freshest hour, leave room for a break, then take the small tasks one at a time.',
    'octopus': 'An octopus has three hearts. Two pump blood to its gills, and one keeps it flowing to the rest of its body. A reminder that nature is wonderfully inventive.',
    'encourage': 'One small step counts. Pick something you can finish in five minutes. I’ll keep you company while you get started.',
}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'media', 'voice')


def peaking(x, sr, f0, gain_db, q=0.9):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / sr; al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return signal.lfilter(b, a, x)


def render(kokoro, g2p, text, voice='af_heart', speed=0.86, semis=4.0, shimmer=0.3, shimmer_ms=6.0,
           comb=0.3, comb_ms=5.0, buzz=0.12, buzz_hz=60, sparkle=4.0, hp=200):
    # misaki is Kokoro's own pronunciation dictionary; it needs no espeak.
    phonemes, _ = g2p(text)
    x, sr = kokoro.create(phonemes, voice=voice, speed=speed, lang='en-us', is_phonemes=True)
    x = x.astype(np.float64)
    # Younger: pitch and formants up together, as a smaller voice is. Spoken
    # slower first, so the shift brings it back to an easy pace.
    up, down = 1000, int(round(1000 * 2 ** (semis / 12))); g = np.gcd(up, down)
    x = signal.resample_poly(x, up // g, down // g)
    # A small speaker, a little bright: no chest, some sparkle.
    b, a = signal.butter(2, hp / (sr / 2), 'highpass'); x = signal.lfilter(b, a, x)
    x = peaking(x, sr, 3800, sparkle)
    b, a = signal.butter(4, 9500 / (sr / 2), 'lowpass'); x = signal.lfilter(b, a, x)
    # Two chips singing together: a copy a hair sharp and a moment late.
    y = signal.resample_poly(x, 1000, 1007)
    y = np.concatenate([np.zeros(int(sr * shimmer_ms / 1000)), y])[:len(x)]
    x = x + shimmer * np.pad(y, (0, len(x) - len(y)))
    # Spoken inside a small box: a short metallic resonance.
    d = int(round(sr * comb_ms / 1000)); den = np.zeros(d + 1); den[0] = 1; den[d] = -comb
    x = signal.lfilter([1 - comb], den, x)
    # And a faint electric buzz riding on it.
    t = np.arange(len(x)) / sr
    x = x * ((1 - buzz) + buzz * np.sin(2 * np.pi * buzz_hz * t))
    x = np.concatenate([np.zeros(int(sr * 0.04)), x, np.zeros(int(sr * 0.08))])
    f = int(sr * 0.012); x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f)
    return x / (np.max(np.abs(x)) + 1e-9) * 0.89, sr


def mp3(x, sr, path):
    enc = lameenc.Encoder(); enc.set_bit_rate(48); enc.set_in_sample_rate(sr); enc.set_channels(1); enc.set_quality(2)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    with open(path, 'wb') as f:
        f.write(enc.encode(pcm) + enc.flush())


if __name__ == '__main__':
    models = sys.argv[1] if len(sys.argv) > 1 else '.'
    kokoro = Kokoro(os.path.join(models, 'kokoro-v1.0.onnx'), os.path.join(models, 'voices-v1.0.bin'))
    g2p = en.G2P(trf=False, british=False, fallback=None)
    os.makedirs(OUT, exist_ok=True)
    for id, text in LINES.items():
        x, sr = render(kokoro, g2p, text)
        mp3(x, sr, os.path.join(OUT, f'{id}.mp3'))
        print(f'{id}.mp3  {len(x) / sr:.1f}s')
