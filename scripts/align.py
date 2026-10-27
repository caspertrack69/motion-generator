#!/usr/bin/env python3
"""Align scene timing to the voice-over audio (audio-based scene timing).

Usage (from the project root):
    python scripts/align.py                        # model small, CPU int8
    python scripts/align.py --model medium
    python scripts/align.py --verbose              # print the transcript

Inputs:
    assets/audio/voiceover.mp3
    scenes.json

Outputs:
    timing.json   { "<scene_id>": { "start": <sec>, "end": <sec> }, ... }
    words.json    [ { "word": <str>, "start": <sec>, "end": <sec> }, ... ]

How it works:
    1. Transcribe the audio with faster-whisper (language "id",
       word_timestamps=True).
    2. Normalize the narration of each scene (lowercase, strip punctuation) and
       keep only ordinary alphabetic words: numbers, version strings and
       acronyms (RCE, SVG, 16.4.1, ...) are ignored, because the transcript
       spells them differently ("ar-si-i", "empat belas", ...).
    3. Search the first 3-5 ordinary words of every scene in the transcript,
       forward only, in scene order (fuzzy match, small gaps allowed for the
       skipped numbers/acronyms).
    4. scene.start = first matched word start - 0.15 s (min 0).
       scene.end   = next scene.start.
       Last scene: end = audio duration + 0.8 s.
       First scene: start = 0.
    5. Print a report (audio duration, video duration, old vs new scene
       duration, >25% scale warnings).

Missing scenes are reported loudly; with --allow-missing they fall back to
scenes.json (never silent).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

DEFAULT_AUDIO = ROOT / "assets" / "audio" / "voiceover.mp3"
DEFAULT_SCENES = ROOT / "scenes.json"
DEFAULT_TIMING = ROOT / "timing.json"
DEFAULT_WORDS = ROOT / "words.json"

WORD_RE = re.compile(r"[^\W\d_]+", re.UNICODE)
EDGE_PUNCT = "\"'“”‘’`´.,;:!?()[]{}<>«»…–—-"

LEAD_IN = 0.15
TAIL_OUT = 0.8

SCALE_WARN = 0.25


def out(text: str = "") -> None:
    print(text, flush=True)


def ratio(a: str, b: str) -> float:
    """Similarity 0..1 (1 = identical), normalized Levenshtein distance."""
    if a == b:
        return 1.0
    if not a or not b:
        return 0.0
    if len(a) > 64 or len(b) > 64:
        return 0.0
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        current = [i] + [0] * len(b)
        for j, cb in enumerate(b, start=1):
            cost = 0 if ca == cb else 1
            current[j] = min(
                previous[j] + 1,      # deletion
                current[j - 1] + 1,   # insertion
                previous[j - 1] + cost,  # substitution
            )
        previous = current
    distance = previous[-1]
    return 1.0 - distance / max(len(a), len(b))


def strip_edges(token: str) -> str:
    return token.strip(EDGE_PUNCT)


def is_acronym(letters: str) -> bool:
    return len(letters) >= 2 and letters.isupper()


def narration_words(text: str) -> list[str]:
    """Ordinary alphabetic words of a narration line.

    Numbers/versions (digits), punctuation and uppercase acronyms are dropped.
    """
    words: list[str] = []
    for raw in text.split():
        core = strip_edges(raw)
        if not core:
            continue
        if any(ch.isdigit() for ch in core):
            continue
        letters = "".join(ch for ch in core if ch.isalpha())
        if letters and is_acronym(letters):
            continue
        for part in WORD_RE.findall(core):
            part = unicodedata.normalize("NFC", part).lower()
            if len(part) >= 2:
                words.append(part)
    return words


class Token:
    __slots__ = ("text", "start", "end", "matchable", "word_index")

    def __init__(self, text: str, start: float, end: float, matchable: bool, word_index: int):
        self.text = text
        self.start = start
        self.end = end
        self.matchable = matchable
        self.word_index = word_index


def transcript_tokens(words) -> list[Token]:
    """Flatten whisper words into comparable tokens (keeps timestamps)."""
    tokens: list[Token] = []
    for index, word in enumerate(words):
        core = strip_edges(word.word or "")
        if not core:
            continue
        start = float(word.start)
        end = float(word.end)
        if any(ch.isdigit() for ch in core):
            tokens.append(Token(core.lower(), start, end, False, index))
            continue
        letters = "".join(ch for ch in core if ch.isalpha())
        acronym = is_acronym(letters) if letters else False
        parts = WORD_RE.findall(core)
        if not parts:
            tokens.append(Token(core.lower(), start, end, False, index))
            continue
        for part in parts:
            part = unicodedata.normalize("NFC", part).lower()
            tokens.append(Token(part, start, end, not acronym, index))
    return tokens


def match_query(
    query: list[str],
    tokens: list[Token],
    start_index: int,
    first_threshold: float,
    match_threshold: float,
    max_gap: int,
):
    """Find `query` in `tokens` forward from `start_index` (monotonic, fuzzy).

    Returns the list of matched token indices, or None.
    """
    for anchor in range(start_index, len(tokens)):
        token = tokens[anchor]
        if not token.matchable:
            continue
        if ratio(query[0], token.text) < first_threshold:
            continue
        matched = [anchor]
        cursor = anchor + 1
        complete = True
        for target in query[1:]:
            limit = min(len(tokens), cursor + max_gap + 1)
            best_index = -1
            best_score = 0.0
            for k in range(cursor, limit):
                candidate = tokens[k]
                if not candidate.matchable:
                    continue
                score = ratio(target, candidate.text)
                if score >= match_threshold and score > best_score:
                    best_index = k
                    best_score = score
                    if score >= 0.999:
                        break
            if best_index < 0:
                complete = False
                break
            matched.append(best_index)
            cursor = best_index + 1
        if complete:
            return matched
    return None


def match_scene(
    narration: str,
    tokens: list[Token],
    start_index: int,
    first_threshold: float,
    match_threshold: float,
    max_gap: int,
    min_words: int,
):
    """Longest prefix (3-5 ordinary words) of `narration` found in `tokens`."""
    words = narration_words(narration)
    if len(words) < min_words:
        return None, words
    lengths = list(range(min(5, len(words)), min_words - 1, -1))
    for length in lengths:
        matched = match_query(
            words[:length],
            tokens,
            start_index,
            first_threshold,
            match_threshold,
            max_gap,
        )
        if matched:
            return matched, words[:length]
    return None, words


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, data) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def format_range(start: float, end: float) -> str:
    return f"{start:7.3f} - {end:7.3f}"


def report(
    scenes,
    timing,
    words,
    audio_duration,
    old_windows,
    matched,
    queries,
    model_name,
    output_warnings,
) -> int:
    video_duration = timing[scenes[-1]["id"]]["end"]
    old_total = old_windows[scenes[-1]["id"]]["end"]

    out("")
    out("=== ALIGN REPORT ==========================================")
    out(f"model            : faster-whisper {model_name} (language=id, word_timestamps)")
    out(f"audio duration   : {audio_duration:8.3f} s")
    out(f"video duration   : {video_duration:8.3f} s  (akhir scene terakhir)")
    out(f"video lama       : {old_total:8.3f} s  (scenes.json)")
    out(f"words            : {len(words)} kata")
    out("")
    out("scene                     old dur    new dur     delta     %      new window (s)")
    out("------------------------------------------------------------------------------")

    warned = []
    for scene in scenes:
        scene_id = scene["id"]
        old_start = old_windows[scene_id]["start"]
        old_end = old_windows[scene_id]["end"]
        old_dur = old_end - old_start
        new_start = timing[scene_id]["start"]
        new_end = timing[scene_id]["end"]
        new_dur = new_end - new_start
        delta = new_dur - old_dur
        percent = (delta / old_dur * 100.0) if old_dur > 0 else 0.0
        flag = ""
        if old_dur > 0 and abs(delta / old_dur) > SCALE_WARN:
            flag = "  <-- scaled >25%"
            warned.append((scene_id, old_dur, new_dur, percent))
        if scene_id not in matched:
            flag = "  <-- NOT FOUND"
        out(
            f"{scene_id:<24} {old_dur:7.3f}   {new_dur:8.3f}  {delta:+8.3f}  "
            f"{percent:+6.1f}%  {format_range(new_start, new_end)}{flag}"
        )

    out("")
    for scene_id, words_used in queries.items():
        if scene_id in matched:
            out(f"match {scene_id:<24} [{matched[scene_id][0]:7.3f}]  '{' '.join(words_used)}'")

    return warned, output_warnings


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Audio-based scene timing for scenes.json (faster-whisper)."
    )
    parser.add_argument("--model", default="small", help="whisper model (default: small)")
    parser.add_argument("--audio", type=Path, default=DEFAULT_AUDIO)
    parser.add_argument("--scenes", type=Path, default=DEFAULT_SCENES)
    parser.add_argument("--timing-out", type=Path, default=DEFAULT_TIMING)
    parser.add_argument("--words-out", type=Path, default=DEFAULT_WORDS)
    parser.add_argument("--language", default="id")
    parser.add_argument("--device", default="cpu", help="cpu / cuda / auto")
    parser.add_argument("--compute-type", default="int8", help="int8 / float16 / float32")
    parser.add_argument("--min-words", type=int, default=3, help="minimum matched prefix words")
    parser.add_argument("--first-threshold", type=float, default=0.80)
    parser.add_argument("--match-threshold", type=float, default=0.70)
    parser.add_argument("--max-gap", type=int, default=12, help="max skipped transcript tokens")
    parser.add_argument(
        "--allow-missing",
        action="store_true",
        help="fall back to scenes.json for unmatched scenes (explicit warning)",
    )
    parser.add_argument("--verbose", action="store_true", help="print transcript and matches")
    args = parser.parse_args(argv)

    for path, label in ((args.audio, "audio"), (args.scenes, "scenes.json")):
        if not path.exists():
            out(f"ERROR: {label} tidak ditemukan: {path}")
            return 1

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        out("ERROR: faster-whisper belum terpasang.")
        out("  pip install faster-whisper")
        return 1

    scenes_data = load_json(args.scenes)
    scenes = scenes_data.get("scenes", [])
    if not scenes:
        out("ERROR: scenes.json tidak berisi scenes.")
        return 1

    old_windows = {
        scene["id"]: {"start": float(scene["time"]["start"]), "end": float(scene["time"]["end"])}
        for scene in scenes
    }

    out(f"Transcribing {args.audio} ... (model={args.model}, device={args.device})")
    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    segments, info = model.transcribe(
        str(args.audio),
        language=args.language,
        word_timestamps=True,
        beam_size=5,
    )
    whisper_words = []
    transcript_words = []
    for segment in segments:
        for word in segment.words or []:
            if word.word is None:
                continue
            whisper_words.append(
                {"word": word.word.strip(), "start": round(float(word.start), 3), "end": round(float(word.end), 3)}
            )
            transcript_words.append(word.word.strip())
    audio_duration = float(getattr(info, "duration", 0.0) or 0.0)
    if audio_duration <= 0 and whisper_words:
        audio_duration = float(whisper_words[-1]["end"])
    if not whisper_words:
        out("ERROR: tidak ada kata yang terbaca dari audio.")
        return 1

    tokens = transcript_tokens(
        [type("W", (), {"word": w["word"], "start": w["start"], "end": w["end"]}) for w in whisper_words]
    )

    if args.verbose:
        out("")
        out("--- TRANSCRIPT --------------------------------------------")
        for w in whisper_words:
            out(f"  {w['start']:7.3f} - {w['end']:7.3f}  {w['word']}")
        out("")

    timing = {}
    matched = {}
    matched_lengths = {}
    queries = {}
    missing = []
    cursor = 0
    previous_start = -1.0

    for scene in scenes:
        scene_id = scene["id"]
        narration = scene.get("narration", "")
        indices, used = match_scene(
            narration,
            tokens,
            cursor,
            args.first_threshold,
            args.match_threshold,
            args.max_gap,
            args.min_words,
        )
        queries[scene_id] = used
        if not indices:
            missing.append(scene_id)
            out(f"WARNING: scene '{scene_id}' tidak ditemukan di transkrip (narration: {narration[:60]}...)")
            continue
        first = tokens[indices[0]]
        start = max(0.0, first.start - LEAD_IN)
        if start <= previous_start:
            out(
                f"WARNING: scene '{scene_id}' match pada {first.start:.3f}s "
                f"tidak lebih maju dari scene sebelumnya ({previous_start:.3f}s)."
            )
            missing.append(scene_id)
            continue
        previous_start = start
        matched[scene_id] = (first.start, used)
        matched_lengths[scene_id] = len(indices)
        timing[scene_id] = {"start": round(start, 3), "end": None}
        cursor = indices[-1] + 1

    if missing and not args.allow_missing:
        out("")
        out(f"ERROR: {len(missing)} scene tidak cocok: {', '.join(missing)}")
        out("timing.json TIDAK ditulis. Periksa transkrip (--verbose) atau turunkan")
        out("--first-threshold/--match-threshold, atau pakai --allow-missing untuk fallback")
        out("eksplisit ke scenes.json.")
        return 2

    for index, scene in enumerate(scenes):
        scene_id = scene["id"]
        if scene_id in timing:
            start = timing[scene_id]["start"]
        elif args.allow_missing:
            start = old_windows[scene_id]["start"]
            timing[scene_id] = {"start": round(start, 3), "end": None}
            out(f"WARNING: scene '{scene_id}' memakai timing scenes.json (fallback eksplisit).")
        else:  # pragma: no cover - guarded above
            return 2
        if index == 0:
            start = 0.0
            timing[scene_id]["start"] = 0.0
        if index + 1 < len(scenes):
            end = timing[scenes[index + 1]["id"]]["start"]
        else:
            end = audio_duration + TAIL_OUT
        timing[scene_id]["end"] = round(end, 3)

    # Re-round starts after the first-scene clamp.
    for scene_id, window in timing.items():
        window["start"] = round(window["start"], 3)
        window["end"] = round(window["end"], 3)

    write_json(args.timing_out, timing)
    write_json(args.words_out, whisper_words)

    warned, _ = report(
        scenes,
        timing,
        whisper_words,
        audio_duration,
        old_windows,
        matched,
        queries,
        args.model,
        [],
    )

    out("")
    if warned:
        out(f"PERINGATAN: {len(warned)} scene diskalakan lebih dari +/-25%:")
        for scene_id, old_dur, new_dur, percent in warned:
            out(f"  - {scene_id}: {old_dur:.3f}s -> {new_dur:.3f}s ({percent:+.1f}%)")
    else:
        out("Semua scene dalam batas +/-25% dari timing lama.")

    out("")
    out(f"Ditulis: {args.timing_out}")
    out(f"Ditulis: {args.words_out}")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # pragma: no cover
        pass
    raise SystemExit(main())
