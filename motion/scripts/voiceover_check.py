"""Text normalization and word error rate shared by the voiceover checks."""
import re

# Spoken spellings in narration.json and the forms Whisper writes them back as.
ALIASES = {"ten-eighty p": "1080p", "jason": "json", "p n g": "png", "m c p": "mcp", "s m s": "sms",
           "c sharp": "c#", "chat gpt": "chatgpt", "back-end": "backend", "back end": "backend", "signed in": "signed-in",
           "sq-lite": "sqlite", "dot net": ".net", "nurse desk": "nursedesk", "carl tampus five at gmail dot com": "carltampus5@gmail.com",
           "karltampus5@gmail.com": "carltampus5@gmail.com", "cue": "queue", "one, two, three": "1, 2, 3"}

def norm(s):
    s = s.lower()
    s = re.sub(r"\s*,\s*at gmail", " at gmail", s)
    for a, b in ALIASES.items():
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9#@. ]|\.(?!com)", " ", s).split()

def wer(ref, hyp):
    d = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        prev, d[0] = d[0], i
        for j, h in enumerate(hyp, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (r != h))
    return d[-1] / max(1, len(ref))
