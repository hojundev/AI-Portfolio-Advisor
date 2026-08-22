/*
 * Voice briefings — ElevenLabs TTS with a Web Speech fallback.
 *
 * With an ElevenLabs key in Settings the briefing streams studio-quality
 * narration; without one it degrades to the browser's built-in voice so the
 * feature always works in a demo.
 *
 * A generation counter makes speech cancellable at every stage: stopSpeaking()
 * bumps the generation and aborts any in-flight fetch, so a response that
 * lands after Stop (or after a newer speak()) is discarded instead of played.
 */

import { getSettings } from "./api.js";
import { riskWord } from "./quant.js";

let generation = 0;
let activeAudio = null;
let activeController = null;
let usingWebSpeech = false;

export function stopSpeaking() {
  generation++;
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
  if (activeAudio) {
    activeAudio.pause();
    if (activeAudio.src?.startsWith("blob:")) URL.revokeObjectURL(activeAudio.src);
    activeAudio = null;
  }
  if (usingWebSpeech && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    usingWebSpeech = false;
  }
}

/**
 * Speak `text`. onState receives ("loading" | "playing" | "idle" | "error",
 * engine) where engine is "elevenlabs" | "browser" — so the UI can report
 * which voice ACTUALLY spoke instead of assuming from the key's presence.
 * Returns a stop() function.
 */
export function speak(text, onState = () => {}) {
  stopSpeaking();
  const myGen = generation;
  const alive = () => myGen === generation;
  const { elevenKey, elevenVoice } = getSettings();

  if (elevenKey) {
    onState("loading", "elevenlabs");
    const controller = new AbortController();
    activeController = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoice || "21m00Tcm4TlvDq8ikWAM"}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
        signal: controller.signal,
      }
    )
      .then((res) => {
        if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        clearTimeout(timeout);
        if (!alive()) return; // stopped (or replaced) while the request was in flight
        const audio = new Audio(URL.createObjectURL(blob));
        activeAudio = audio;
        audio.onended = () => {
          if (alive()) {
            onState("idle", "elevenlabs");
            stopSpeaking();
          }
        };
        audio.onerror = () => alive() && onState("error", "elevenlabs");
        audio
          .play()
          .then(() => alive() && onState("playing", "elevenlabs"))
          .catch(() => alive() && onState("error", "elevenlabs"));
      })
      .catch(() => {
        clearTimeout(timeout);
        if (!alive()) return; // user-initiated abort — stay silent
        webSpeak(text, onState, alive); // key present but call failed → degrade
      });
  } else {
    webSpeak(text, onState, () => myGen === generation);
  }
  return stopSpeaking;
}

function webSpeak(text, onState, alive = () => true) {
  if (!("speechSynthesis" in window)) {
    onState("error", "browser");
    return;
  }
  if (!alive()) return;
  usingWebSpeech = true;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.02;
  utter.pitch = 0.95;
  utter.onstart = () => alive() && onState("playing", "browser");
  utter.onend = () => {
    usingWebSpeech = false;
    if (alive()) onState("idle", "browser");
  };
  utter.onerror = () => alive() && onState("error", "browser");
  window.speechSynthesis.speak(utter);
}

/** Compose the spoken script for a portfolio briefing. */
export function buildBriefingScript(portfolio, m, narrative, name = null) {
  if (m.empty) return `Your portfolio ${portfolio.name} is empty. Add a few holdings and I'll brief you on the risk picture.`;
  const lines = [
    `${name ? `${name}, here` : "Here"} is your briefing for ${portfolio.name}.`,
    narrative,
    `Overall health grade: ${m.grade.replace("−", " minus").replace("+", " plus")}.`,
    `That's the picture. This is an educational simulation, not financial advice.`,
  ];
  return lines.join(" ");
}

export function isConfigured() {
  return Boolean(getSettings().elevenKey);
}

// re-export for convenience in components
export { riskWord };
