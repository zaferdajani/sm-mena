"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// Minimal typing for the Web Speech API (not in every TypeScript DOM lib).
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => Recognition;

function recognitionClass(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};

/**
 * Dictation into the chat box with the browser's own speech recognition
 * (nothing is uploaded by Sawwiq). Hidden where the browser has none.
 */
export function VoiceButton({ lang, value, onChange, label, stopLabel, listeningLabel }: { lang: string; value: string; onChange: (text: string) => void; label: string; stopLabel: string; listeningLabel: string }) {
  const supported = useSyncExternalStore(noop, () => recognitionClass() !== null, () => false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  useEffect(() => () => rec.current?.abort(), []);
  if (!supported) return null;

  const start = () => {
    const Ctor = recognitionClass();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = false;
    const before = value.trim();
    r.onresult = (e) => {
      let said = "";
      for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
      onChange([before, said.trim()].filter(Boolean).join(" "));
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => (listening ? rec.current?.stop() : start())}
        aria-label={listening ? stopLabel : label}
        aria-pressed={listening}
        title={listening ? stopLabel : label}
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          listening ? "animate-pulse border-destructive bg-destructive/10 text-destructive" : "hover:bg-muted",
        )}
        data-testid="voice-button"
      >
        {listening ? <Square className="size-4" /> : <Mic className="size-4" />}
      </button>
      {listening && (
        <span role="status" className="sr-only">
          {listeningLabel}
        </span>
      )}
    </>
  );
}
