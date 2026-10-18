"use client";

import * as React from "react";
import { Sparkles, X, Send, Bot, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

let messageSequence = 0;
function getNextMessageId(prefix: string): string {
  messageSequence += 1;
  return `${prefix}-${messageSequence}`;
}

function getCurrentTimeLabel(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

const STARTER_PROMPTS = [
  "Can I afford a $25 dinner tonight?",
  "How much have I spent this month?",
  "What is my daily allowance today?",
  "Where did most of my money go?",
];

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm **Finora AI**, your personal money assistant. I have live access to your budget, daily allowance, and recent transactions. How can I help you today?",
  timestamp: "Just now",
};

export function AIChatDrawer() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: getNextMessageId("user"),
      role: "user",
      content: text,
      timestamp: getCurrentTimeLabel(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to reach Finora AI");
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: getNextMessageId("assistant"),
        role: "assistant",
        content: data.reply,
        timestamp: getCurrentTimeLabel(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: getNextMessageId("error"),
        role: "assistant",
        content:
          err instanceof Error
            ? `⚠️ ${err.message}`
            : "⚠️ Sorry, I had trouble answering that. Please check your internet connection or Gemini API key.",
        timestamp: getCurrentTimeLabel(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "relative group flex items-center gap-2 p-3 sm:px-4 sm:py-3 rounded-full text-white shadow-xl transition-all duration-200 cursor-pointer active:scale-95",
            isOpen
              ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 shadow-zinc-900/30"
              : "bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-brand-600/30 ring-4 ring-white/80 dark:ring-zinc-950/80 hover:scale-105"
          )}
          aria-label={isOpen ? "Close AI chat" : "Open Finora AI chat"}
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <>
              <Sparkles className="h-5 w-5 animate-pulse text-amber-300" />
              <span className="hidden sm:inline text-xs font-bold tracking-wide">
                Ask Finora AI
              </span>
            </>
          )}
        </button>
      </div>

      {/* Slide-Over Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full sm:w-[420px] h-[85vh] sm:h-[620px] rounded-t-[28px] sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-right-5 duration-200"
            role="dialog"
            aria-label="Finora AI Financial Assistant"
          >
            {/* Mobile Grab Handle */}
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-accent-400 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 leading-tight">
                    Finora AI Advisor
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full">
                      Live
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Your personal finance assistant
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title="Clear conversation"
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {messages.map((m) => {
                const isAssistant = m.role === "assistant";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex gap-2.5 items-start",
                      isAssistant ? "justify-start" : "justify-end"
                    )}
                  >
                    {isAssistant && (
                      <div className="w-6 h-6 rounded-lg bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-accent-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-3 w-3" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "rounded-2xl p-3 max-w-[85%] leading-relaxed shadow-xs",
                        isAssistant
                          ? "bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 rounded-tl-sm border border-zinc-200/50 dark:border-zinc-700/50"
                          : "bg-brand-600 text-white rounded-tr-sm"
                      )}
                    >
                      <div className="whitespace-pre-wrap font-sans text-xs space-y-1">
                        {m.content}
                      </div>
                      <span
                        className={cn(
                          "block text-[9px] mt-1 text-right",
                          isAssistant
                            ? "text-zinc-400 dark:text-zinc-500"
                            : "text-brand-100/80"
                        )}
                      >
                        {m.timestamp}
                      </span>
                    </div>

                    {!isAssistant && (
                      <div className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-2.5 items-start justify-start animate-in fade-in">
                  <div className="w-6 h-6 rounded-lg bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-accent-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3 w-3 animate-spin" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm p-3 bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[11px] font-medium ml-1">Analyzing your budget...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Starter Prompts (Shown if conversation has only 1 message) */}
            {messages.length === 1 && (
              <div className="px-4 pb-2 shrink-0">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Suggested Questions:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left active:scale-98"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-950/40 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Finora AI about your money..."
                  disabled={isLoading}
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="h-9 w-9 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-xs shrink-0 cursor-pointer active:scale-95"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
