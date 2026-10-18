"use client";

import * as React from "react";

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
  const [error, setError] = React.useState<string | null>(null);

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
        setError("Voice recognition is not supported in this browser.");
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
            setError("Microphone access was denied. Please allow microphone permissions.");
          } else if (errCode === "no-speech") {
            setError("No speech was detected. Please try speaking again.");
          } else if (errCode !== "aborted") {
            setError(`Voice recognition error: ${errCode}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to start voice recognition.";
        setError(message);
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
