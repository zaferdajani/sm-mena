"""Bug agent (docs/61): speech to text for voice notes and screen recordings.

Runs on the agent's own machine with faster-whisper; no audio leaves it. Prints one
JSON object per input file. Usage: python transcribe.py <file.wav> [...]
The model is WHISPER_MODEL (default "small", multilingual; Arabic and English).
"""
import json
import os
import sys

from faster_whisper import WhisperModel

model = WhisperModel(os.environ.get("WHISPER_MODEL", "small"), device="cpu", compute_type="int8")
for path in sys.argv[1:]:
    try:
        segments, info = model.transcribe(path, vad_filter=True, beam_size=5)
        parts = [{"start": round(s.start, 1), "end": round(s.end, 1), "text": s.text.strip()} for s in segments]
        print(json.dumps({"file": path, "language": info.language, "probability": round(info.language_probability, 2), "segments": parts}, ensure_ascii=False), flush=True)
    except Exception as e:  # one bad file never stops the others
        print(json.dumps({"file": path, "error": str(e)[:300]}), flush=True)
