import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Sparkles, Volume2, VolumeX } from "lucide-react";
import { suggestions } from "../lib/advisor.js";
import { speak, stopSpeaking } from "../lib/voice.js";
import { Card } from "./ui.jsx";

const SpeechRecognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

function StructuredAnswer({ s }) {
  return (
    <div className="space-y-2.5">
      {s.found?.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink3">What I found</p>
          <ul className="space-y-1">
            {s.found.map((line, i) => (
              <li key={i} className="flex gap-1.5 leading-5">
                <span className="text-ink3" aria-hidden="true">·</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
      {s.watch?.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-warn">Items to watch</p>
          <ul className="space-y-1">
            {s.watch.map((line, i) => (
              <li key={i} className="flex gap-1.5 leading-5">
                <span className="text-warn" aria-hidden="true">·</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
      {s.bottom && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink3">Bottom line</p>
          <p className="leading-5">{s.bottom}</p>
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({ portfolio, metrics, messages, onSend, thinking }) {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const spokenCount = useRef(0);

  useEffect(
    () => () => {
      recognitionRef.current?.abort?.();
      stopSpeaking();
    },
    []
  );

  // speak new advisor replies when voice replies are on
  useEffect(() => {
    if (!voiceReplies) {
      spokenCount.current = messages.length;
      return;
    }
    if (messages.length <= spokenCount.current) return;
    spokenCount.current = messages.length;
    const last = messages[messages.length - 1];
    if (last?.role !== "advisor") return;
    const text = last.structured
      ? [...(last.structured.found || []), last.structured.bottom].filter(Boolean).join(" ")
      : last.text;
    if (text) speak(text, () => {});
  }, [messages, voiceReplies]);

  const toggleMic = () => {
    if (!SpeechRecognition) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SpeechRecognition();
    recognitionRef.current = rec;
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript?.trim();
      if (transcript) onSend(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  const send = (text) => {
    const message = (text ?? input).trim();
    if (!message || thinking) return;
    setInput("");
    onSend(message);
  };

  const chips = suggestions(portfolio, metrics);

  return (
    <Card className="flex min-h-[400px] flex-1 flex-col xl:min-h-0">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-bg" aria-hidden="true">
            <Sparkles size={14} />
          </span>
          <div>
            <p className="text-[13px] font-semibold leading-tight text-ink">Advisor</p>
            <p className="text-[10px] leading-tight text-ink3">grounded in your live numbers</p>
          </div>
        </div>
        <span className="flex items-center gap-2">
          <button
            onClick={() => {
              setVoiceReplies((v) => {
                if (v) stopSpeaking();
                return !v;
              });
            }}
            aria-label={voiceReplies ? "Turn voice replies off" : "Turn voice replies on"}
            aria-pressed={voiceReplies}
            title={voiceReplies ? "Voice replies on" : "Voice replies off"}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
              voiceReplies ? "border-linestrong bg-panel2 text-ink" : "border-transparent text-ink3 hover:text-ink"
            }`}
          >
            {voiceReplies ? <Volume2 size={13} aria-hidden="true" /> : <VolumeX size={13} aria-hidden="true" />}
          </button>
          <span className="flex items-center gap-1.5 text-[10px] text-ink3">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full" style={{ background: "var(--up)" }} aria-hidden="true" />
            on-device
          </span>
        </span>
      </div>

      <div ref={scrollRef} role="log" aria-label="Advisor conversation" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <p className="font-serif text-lg leading-snug text-ink">
              Your AI advisor<br />
              <em>is ready to help.</em>
            </p>
            <p className="mt-2 max-w-[230px] text-[11px] leading-4 text-ink3">
              Every answer is computed from {portfolio.name}'s real numbers. It can even edit the portfolio for you.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {chips.map((c) => (
                <button
                  key={c}
                  onClick={() => send(c)}
                  className="rounded-full border border-line px-3 py-1.5 text-[11px] text-ink2 transition hover:border-linestrong hover:text-ink"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`anim-fade-up flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs ${
                msg.role === "user"
                  ? "rounded-br-md bg-ink text-bg"
                  : "rounded-bl-md border border-line bg-panel2/60 text-ink2"
              }`}
            >
              {msg.structured ? <StructuredAnswer s={msg.structured} /> : <span className="leading-5">{msg.text}</span>}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <span className="sr-only">Advisor is thinking</span>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-panel2/60 px-4 py-3" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-ink3"
                  style={{ animation: `typingDot 1.1s ease-in-out ${i * 0.15}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && !thinking && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {chips.slice(0, 3).map((c) => (
              <button
                key={c}
                onClick={() => send(c)}
                className="rounded-full border border-line px-2.5 py-1 text-[10px] text-ink3 transition hover:border-linestrong hover:text-ink"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-panel2/60 p-1 pl-3 transition focus-within:border-linestrong">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={listening ? "Listening…" : 'Try "what if I add GLD?"'}
            aria-label="Message the advisor"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-xs text-ink outline-none placeholder:text-ink3"
          />
          {SpeechRecognition && (
            <button
              onClick={toggleMic}
              aria-label={listening ? "Stop listening" : "Ask by voice"}
              aria-pressed={listening}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
                listening ? "border-linestrong bg-panel text-down" : "border-transparent text-ink3 hover:text-ink"
              }`}
            >
              <Mic size={14} className={listening ? "pulse-dot" : ""} aria-hidden="true" />
            </button>
          )}
          <button
            onClick={() => send()}
            disabled={!input.trim() || thinking}
            aria-label="Send message"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-bg transition hover:opacity-85 disabled:opacity-30"
          >
            <ArrowUp size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </Card>
  );
}
