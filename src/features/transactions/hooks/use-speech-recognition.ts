"use client";

import * as React from "react";
import { useT } from "@/lib/i18n";
import type { txDialogs } from "@/lib/i18n/messages/txDialogs";

type SpeechErrorState =
  | { key: keyof typeof txDialogs.en; values?: Record<string, string> }
  | { raw: string };

export interface SpeechRecognitionResultState {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: (onResult?: (finalText: string) => void) => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

// Window interface augmentation helper
interface SpeechRecognitionChunk {
  transcript: string;
}

interface SpeechRecognitionAlternativeList {
  [index: number]: SpeechRecognitionChunk;
  length: number;
}

interface SpeechRecognitionResultItem extends SpeechRecognitionAlternativeList {
  isFinal: boolean;
}

interface SpeechRecognitionEventPayload {
  resultIndex: number;
  results: {
    [index: number]: SpeechRecognitionResultItem;
    length: number;
  };
}

interface SpeechRecognitionErrorPayload {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventPayload) => void) | null;
  onerror: ((event: SpeechRecognitionErrorPayload) => void) | null;
  onend: (() => void) | null;
}

const emptySubscribe = () => () => {};

function getSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

function getServerSnapshot(): boolean {
  return false;
}

export function useSpeechRecognition(): SpeechRecognitionResultState {
  const [transcript, setTranscript] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const t = useT("txDialogs");
  const [errorState, setError] = React.useState<SpeechErrorState | null>(null);
  const error = errorState
    ? "raw" in errorState
      ? errorState.raw
      : t(errorState.key, errorState.values)
    : null;

  const isSupported = React.useSyncExternalStore(
    emptySubscribe,
    getSpeechSupported,
    getServerSnapshot
  );

  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);
  const onResultCallbackRef = React.useRef<((finalText: string) => void) | null>(null);

  const stopListening = React.useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = React.useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  const startListening = React.useCallback(
    (onResult?: (finalText: string) => void) => {
      setError(null);
      setTranscript("");
      onResultCallbackRef.current = onResult || null;

      if (typeof window === "undefined") return;

      const win = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
      };

      const SpeechRecognitionClass =
        win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        setError({ key: "speechNotSupported" });
        return;
      }

      try {
        // Clean up any existing instance
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {
            // Ignore
          }
        }

        const recognition = new SpeechRecognitionClass();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: SpeechRecognitionEventPayload) => {
          let currentInterim = "";
          let finalSpeech = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcriptChunk = event.results[i][0]?.transcript || "";
            if (event.results[i]?.isFinal) {
              finalSpeech += transcriptChunk;
            } else {
              currentInterim += transcriptChunk;
            }
          }

          const combined = (finalSpeech || currentInterim).trim();
          setTranscript(combined);

          if (finalSpeech.trim() && onResultCallbackRef.current) {
            onResultCallbackRef.current(finalSpeech.trim());
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorPayload) => {
          const errCode = event.error || "unknown";
          if (errCode === "not-allowed" || errCode === "permission-denied") {
            setError({ key: "micDenied" });
          } else if (errCode === "no-speech") {
            setError({ key: "noSpeech" });
          } else if (errCode !== "aborted") {
            setError({ key: "speechError", values: { code: errCode } });
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: unknown) {
        setError(
          err instanceof Error && err.message
            ? { raw: err.message }
            : { key: "speechStartFailed" }
        );
        setIsListening(false);
      }
    },
    []
  );

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
