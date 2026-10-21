"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Trash2,
  ShoppingBag,
  ShieldCheck,
  PieChart,
  Utensils,
  Target,
  CalendarClock,
  PiggyBank,
  Banknote,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { MESSAGES } from "@/lib/i18n/messages";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

type AiMessageKey = keyof (typeof MESSAGES)["ai"]["en"];

interface QuickMoneyQuestion {
  id: string;
  titleKey: AiMessageKey;
  categoryKey: AiMessageKey;
  icon: LucideIcon;
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

// Labels are message keys, translated at render. The displayed (localized)
// question is what gets sent: the API forwards it to Gemini, whose prompt
// already answers Khmer questions in Khmer.
const USEFUL_MONEY_QUESTIONS: QuickMoneyQuestion[] = [
  { id: "afford", titleKey: "qAffordTitle", categoryKey: "qAffordCategory", icon: ShoppingBag },
  { id: "allowance", titleKey: "qAllowanceTitle", categoryKey: "qAllowanceCategory", icon: ShieldCheck },
  { id: "breakdown", titleKey: "qBreakdownTitle", categoryKey: "qBreakdownCategory", icon: PieChart },
  { id: "food", titleKey: "qFoodTitle", categoryKey: "qFoodCategory", icon: Utensils },
  { id: "goals", titleKey: "qGoalsTitle", categoryKey: "qGoalsCategory", icon: Target },
  { id: "bills", titleKey: "qBillsTitle", categoryKey: "qBillsCategory", icon: CalendarClock },
  { id: "save", titleKey: "qSaveTitle", categoryKey: "qSaveCategory", icon: PiggyBank },
  { id: "riel", titleKey: "qRielTitle", categoryKey: "qRielCategory", icon: Banknote },
];

// The welcome bubble is rendered from the catalog so it follows the active language
const WELCOME_ID = "welcome";
const INITIAL_MESSAGE: ChatMessage = {
  id: WELCOME_ID,
  role: "assistant",
  content: "",
  timestamp: "",
};

export function AIChatDrawer() {
  const tNav = useT("nav");
  const t = useT("ai");
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
            content: m.id === WELCOME_ID ? t("welcome") : m.content,
          })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || t("errorReach"));
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
            : `⚠️ ${t("errorGeneric")}`,
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
      {/* Header trigger: AI is occasional, so it lives in the top bar instead of a floating button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "relative flex items-center gap-1.5 rounded-xl p-2 text-sm font-semibold transition-colors cursor-pointer",
          isOpen
            ? "bg-brand-50 text-brand-700 dark:bg-zinc-800 dark:text-accent-300"
            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
        )}
        aria-label={isOpen ? tNav("closeAiChat") : tNav("openAiChat")}
      >
        <Sparkles className="h-5 w-5 text-brand-600 dark:text-accent-400" />
        <span className="hidden md:inline text-xs">{tNav("askAi")}</span>
      </button>

      {/* Slide-Over Drawer / Modal (portaled so the blurred header doesn't clip it) */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full sm:w-[440px] h-[85dvh] sm:h-[640px] rounded-t-[28px] sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-right-5 duration-200"
            role="dialog"
            aria-label={t("dialogLabel")}
          >
            {/* Mobile Grab Handle */}
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-accent-400 flex items-center justify-center shadow-xs">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 leading-tight">
                    <span className="truncate">{t("title")}</span>
                    <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full">
                      {t("live")}
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    {t("subtitle")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title={t("clearConversation")}
                  aria-label={t("clearConversation")}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title={t("closeChat")}
                  aria-label={t("closeChat")}
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
                      <div className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-accent-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
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
                        {m.id === WELCOME_ID ? t("welcome") : m.content}
                      </div>
                      <span
                        className={cn(
                          "block text-[9px] mt-1 text-right",
                          isAssistant
                            ? "text-zinc-400 dark:text-zinc-500"
                            : "text-brand-100/80"
                        )}
                      >
                        {m.id === WELCOME_ID ? t("justNow") : m.timestamp}
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
                  <div className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-accent-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3 w-3 animate-spin" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm p-3 bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[11px] font-medium ml-1">{t("analyzing")}</span>
                  </div>
                </div>
              )}

              {/* Initial Welcome Question Grid */}
              {messages.length === 1 && (
                <div className="pt-2 space-y-2">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {t("helpfulQuestions")}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {USEFUL_MONEY_QUESTIONS.map((q) => {
                      const Icon = q.icon;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => handleSendMessage(t(q.titleKey))}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 hover:bg-brand-50/60 dark:hover:bg-brand-950/40 hover:border-brand-300 dark:hover:border-brand-700 transition-all text-left cursor-pointer active:scale-[0.98]"
                        >
                          <div className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-accent-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">
                              {t(q.titleKey)}
                            </p>
                            <span className="text-[9px] text-zinc-400 font-medium">
                              {t(q.categoryKey)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Horizontal Suggestion Chips (Available even during active chat) */}
            {messages.length > 1 && (
              <div className="px-3 py-1.5 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-zinc-950/20 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {USEFUL_MONEY_QUESTIONS.map((q) => {
                    const Icon = q.icon;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleSendMessage(t(q.titleKey))}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-accent-400 hover:border-brand-400 dark:hover:border-accent-500 transition-colors shrink-0 cursor-pointer active:scale-95"
                      >
                        <Icon className="h-3 w-3 text-brand-600 dark:text-accent-400 shrink-0" />
                        <span>{t(q.titleKey)}</span>
                      </button>
                    );
                  })}
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
                  placeholder={t("placeholder")}
                  disabled={isLoading}
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all"
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label={t("send")}
                  disabled={!input.trim() || isLoading}
                  className="h-9 w-9 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white shadow-xs shrink-0 cursor-pointer active:scale-95"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
