import React, { useEffect, useRef, useState } from "react";
import { Pause, Volume2 } from "lucide-react";
import { buildNarrative } from "../lib/quant.js";
import { buildBriefingScript, isConfigured, speak, stopSpeaking } from "../lib/voice.js";
import { firstName, getSession } from "../lib/session.js";
import { Card } from "./ui.jsx";

export default function BriefingCard({ portfolio, metrics }) {
  const [voiceState, setVoiceState] = useState("idle"); // idle | loading | playing | error
  const [voiceEngine, setVoiceEngine] = useState(null); // which engine ACTUALLY spoke
  const narrative = buildNarrative(portfolio, metrics);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopSpeaking();
    };
  }, []);

  // stop narration if the portfolio being narrated changes
  useEffect(() => {
    stopSpeaking();
    setVoiceState("idle");
  }, [portfolio.id]);

  const toggleVoice = () => {
    if (voiceState === "playing" || voiceState === "loading") {
      stopSpeaking();
      setVoiceState("idle");
      return;
    }
    const script = buildBriefingScript(portfolio, metrics, narrative, firstName(getSession()));
    speak(script, (state, engine) => {
      if (!mounted.current) return;
      setVoiceState(state);
      if (state === "playing") setVoiceEngine(engine);
    });
  };

  const busy = voiceState === "loading";
  const playing = voiceState === "playing";

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink3">Daily briefing</p>
        <button
          onClick={toggleVoice}
          disabled={metrics.empty}
          className={`flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
            playing || busy ? "border-linestrong bg-panel2 text-ink" : "border-line text-ink2 hover:border-linestrong hover:text-ink"
          }`}
          aria-label={playing ? "Stop voice briefing" : "Play voice briefing"}
        >
          {playing ? <Pause size={13} aria-hidden="true" /> : <Volume2 size={13} className={busy ? "pulse-dot" : ""} aria-hidden="true" />}
          {busy ? "Preparing…" : playing ? "Stop" : "Listen"}
        </button>
      </div>

      <p className="px-5 pb-4 pt-2 font-serif text-[16.5px] leading-[1.55] text-ink" style={{ fontOpticalSizing: "auto" }}>
        {narrative}
      </p>

      <p className="border-t border-line px-5 py-2 text-[10px] text-ink3">
        {voiceState === "error"
          ? "Voice unavailable; check your ElevenLabs key in Settings"
          : voiceEngine === "elevenlabs"
            ? "Narrated by ElevenLabs"
            : voiceEngine === "browser"
              ? "Browser voice; add an ElevenLabs key in Settings for studio narration"
              : isConfigured()
                ? "ElevenLabs voice ready"
                : "Add an ElevenLabs key in Settings for studio narration"}{" "}
        · educational, not financial advice
      </p>
    </Card>
  );
}
