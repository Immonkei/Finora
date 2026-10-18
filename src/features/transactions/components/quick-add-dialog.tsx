"use client";

import * as React from "react";
import {
  X,
  Utensils,
  ShoppingCart,
  Car,
  Home,
  Tv,
  ShoppingBag,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Zap,
  WifiOff,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createTransaction } from "../actions";
import { parseNaturalLanguageInput } from "../nlp-parser";
import { parseVoiceExpense } from "../voice-parser";
import { useSpeechRecognition } from "../hooks/use-speech-recognition";
import { enqueueOfflineTransaction } from "@/lib/offline-queue";
import { usePWA } from "@/components/pwa-provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CATEGORY_ICONS } from "@/features/categories/components/category-manager";

interface QuickAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEFAULT_CATEGORIES = [
  { id: "cat-1", name: "Food & Drinks", color: "#EF4444", icon: Utensils },
  { id: "cat-2", name: "Groceries", color: "#F59E0B", icon: ShoppingCart },
  { id: "cat-3", name: "Transport", color: "#3B82F6", icon: Car },
  { id: "cat-4", name: "Housing & Bills", color: "#8B5CF6", icon: Home },
  { id: "cat-5", name: "Entertainment", color: "#EC4899", icon: Tv },
  { id: "cat-6", name: "Shopping", color: "#10B981", icon: ShoppingBag },
];

export function QuickAddDialog({
  isOpen,
  onClose,
  onSuccess,
}: QuickAddDialogProps) {
  const { isOffline } = usePWA();
  const [categoriesList, setCategoriesList] = React.useState(DEFAULT_CATEGORIES);
  const [entryMode, setEntryMode] = React.useState<"keypad" | "nlp" | "voice">("keypad");
  const [nlpText, setNlpText] = React.useState("");

  const {
    transcript,
    isListening,
    isSupported: isSpeechSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const [type, setType] = React.useState<"expense" | "income" | "transfer">("expense");
  const [amountStr, setAmountStr] = React.useState("");
  const [currency, setCurrency] = React.useState<"USD" | "KHR">("USD");
  const [selectedCategory, setSelectedCategory] = React.useState<string>(DEFAULT_CATEGORIES[0].id);
  const [note, setNote] = React.useState("");
  const [receiptImage, setReceiptImage] = React.useState<string | null>(null);
  const [remoteReceiptUrl, setRemoteReceiptUrl] = React.useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = React.useState(false);
  const [isScanningReceipt, setIsScanningReceipt] = React.useState(false);
  const [scannedSummary, setScannedSummary] = React.useState<{
    merchant?: string;
    amount?: number;
    category?: string;
    confidence?: number;
    source?: string;
    bankName?: string;
    transactionId?: string;
  } | null>(null);

  // Load user's actual categories from Supabase on mount
  React.useEffect(() => {
    async function loadCategories() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: dbCats } = await supabase
            .from("categories")
            .select("id, name, color, icon")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true });

          if (dbCats && dbCats.length > 0) {
            const mapped = dbCats.map((c) => ({
              id: c.id,
              name: c.name,
              color: c.color || "#3B82F6",
              icon: (c.icon && CATEGORY_ICONS[c.icon]) || Sparkles,
            }));
            // Spec FR-T5: Category is preselected with the last used category
            let preselectedId = mapped[0].id;
            const { data: lastTx } = await supabase
              .from("transactions")
              .select("category_id")
              .eq("user_id", user.id)
              .is("deleted_at", null)
              .not("category_id", "is", null)
              .order("occurred_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (lastTx?.category_id && mapped.some((c) => c.id === lastTx.category_id)) {
              preselectedId = lastTx.category_id;
            }

            setCategoriesList(mapped);
            setSelectedCategory(preselectedId);
          }
        }
      } catch {
        // Fallback to default categories
      }
    }
    loadCategories();
  }, []);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const nlpInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus when dialog opens (Spec FR-T4)
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (entryMode === "keypad") {
          inputRef.current?.focus();
        } else if (entryMode === "nlp") {
          nlpInputRef.current?.focus();
        }
        setErrorMessage(null);
      }, 60);
      return () => clearTimeout(timer);
    } else {
      if (isListening) stopListening();
    }
  }, [isOpen, entryMode, isListening, stopListening]);

  if (!isOpen) return null;

  // Handle Natural Language Parse on change
  const handleNlpChange = (text: string) => {
    setNlpText(text);
    const parsed = parseNaturalLanguageInput(text);
    if (parsed) {
      setAmountStr(parsed.amount.toString());
      setCurrency(parsed.currency);
      setNote(parsed.note);
      const matchedCat = categoriesList.find(
        (c) => c.name.toLowerCase() === parsed.categoryName.toLowerCase()
      );
      if (matchedCat) {
        setSelectedCategory(matchedCat.id);
      }
    }
  };

  // Handle Voice Parse on speech recognition result
  const handleVoiceTranscript = (spokenText: string) => {
    if (!spokenText.trim()) return;
    const parsed = parseVoiceExpense(spokenText);
    if (parsed) {
      setAmountStr(parsed.amount.toString());
      setCurrency(parsed.currency);
      setNote(parsed.note);
      const matchedCat = categoriesList.find(
        (c) => c.name.toLowerCase() === parsed.categoryName.toLowerCase()
      );
      if (matchedCat) {
        setSelectedCategory(matchedCat.id);
      }
      toast.success("Voice Logged!", {
        description: `${parsed.note} • ${parsed.currency === "USD" ? "$" : "៛"}${parsed.amount}`,
      });
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setReceiptImage(localUrl);

      if (!isOffline) {
        setIsUploadingReceipt(true);
        setIsScanningReceipt(true);
        setScannedSummary(null);
        toast.info("Scanning receipt with AI...");

        try {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/scan-receipt", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();

          if (data.success) {
            if (data.receiptUrl) {
              setRemoteReceiptUrl(data.receiptUrl);
            }

            // Auto-fill extracted fields
            if (data.amount && data.amount > 0) {
              setAmountStr(data.amount.toString());
            }
            if (data.currency) {
              setCurrency(data.currency);
            }
            if (data.merchant) {
              const noteText = data.transactionId
                ? `${data.merchant} [Ref: ${data.transactionId}]`
                : data.merchant;
              setNote(noteText);
            }
            if (data.category) {
              const matchedCat = categoriesList.find(
                (c) => c.name.toLowerCase() === data.category.toLowerCase()
              );
              if (matchedCat) {
                setSelectedCategory(matchedCat.id);
              }
            }

            setScannedSummary({
              merchant: data.merchant,
              amount: data.amount,
              category: data.category,
              confidence: data.confidence,
              source: data.source,
              bankName: data.bankName,
              transactionId: data.transactionId,
            });

            const sourceTitle = data.bankName
              ? `${data.bankName} Voucher detected!`
              : "Receipt auto-filled!";

            toast.success(`✨ ${sourceTitle}`, {
              description: `${data.merchant || "Store"} • ${data.currency === "USD" ? "$" : "៛"}${data.amount || 0}`,
            });
          } else {
            toast.error("Receipt scan failed", { description: data.error });
          }
        } catch {
          toast.error("Could not scan receipt image");
        } finally {
          setIsUploadingReceipt(false);
          setIsScanningReceipt(false);
        }
      } else {
        toast.info("Receipt attached locally (offline mode)");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalAmount = parseFloat(amountStr);
    let finalNote = note;
    let finalCurrency = currency;

    if (entryMode === "nlp" && nlpText) {
      const parsed = parseNaturalLanguageInput(nlpText);
      if (parsed) {
        finalAmount = parsed.amount;
        finalNote = parsed.note;
        finalCurrency = parsed.currency;
      }
    } else if (entryMode === "voice" && transcript) {
      const parsed = parseVoiceExpense(transcript);
      if (parsed) {
        finalAmount = parsed.amount;
        finalNote = parsed.note;
        finalCurrency = parsed.currency;
      }
    }

    if (isNaN(finalAmount) || finalAmount <= 0) {
      setErrorMessage("Please enter a valid amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // If client is currently offline, queue transaction locally
    if (isOffline) {
      enqueueOfflineTransaction({
        type,
        amount: finalAmount,
        currency: finalCurrency,
        category_id: type === "expense" ? selectedCategory : undefined,
        note: finalNote.trim() || undefined,
        occurred_at: new Date().toISOString(),
      });

      setIsSubmitting(false);
      toast.info("Saved offline", {
        description: `${finalCurrency === "USD" ? "$" : "៛"}${finalAmount.toFixed(
          finalCurrency === "USD" ? 2 : 0
        )} queued. Will automatically sync to cloud when connected.`,
      });

      // Reset form
      setAmountStr("");
      setNote("");
      setNlpText("");
      resetTranscript();
      setReceiptImage(null);
      onSuccess?.();
      onClose();
      return;
    }

    try {
      const res = await createTransaction({
        type,
        amount: finalAmount,
        currency: finalCurrency,
        account_id: "00000000-0000-0000-0000-000000000001",
        category_id: type === "expense" ? selectedCategory : undefined,
        note: finalNote.trim() || undefined,
        receipt_url: remoteReceiptUrl || undefined,
        occurred_at: new Date().toISOString(),
      });

      setIsSubmitting(false);

      if (res.success) {
        toast.success(
          type === "expense"
            ? "Expense recorded!"
            : type === "income"
            ? "Income recorded!"
            : "Transfer completed!",
          {
            description: `${finalCurrency === "USD" ? "$" : "៛"}${finalAmount.toFixed(finalCurrency === "USD" ? 2 : 0)} ${finalNote ? `• ${finalNote}` : ""}${remoteReceiptUrl || receiptImage ? " (Receipt attached)" : ""}`,
          }
        );
        // Reset form
        setAmountStr("");
        setNote("");
        setNlpText("");
        resetTranscript();
        setReceiptImage(null);
        setRemoteReceiptUrl(null);
        onSuccess?.();
        onClose();
      } else {
        setErrorMessage(res.error || "Failed to save transaction");
        toast.error("Could not save transaction", {
          description: res.error,
        });
      }
    } catch {
      // In case network connection dropped mid-request
      enqueueOfflineTransaction({
        type,
        amount: finalAmount,
        currency: finalCurrency,
        category_id: type === "expense" ? selectedCategory : undefined,
        note: finalNote.trim() || undefined,
        occurred_at: new Date().toISOString(),
      });

      setIsSubmitting(false);
      toast.info("Network disconnected — saved offline", {
        description: "Transaction queued locally and will sync when back online.",
      });

      setAmountStr("");
      setNote("");
      setNlpText("");
      resetTranscript();
      setReceiptImage(null);
      onSuccess?.();
      onClose();
    }
  };

  const handleModalClose = () => {
    if (isListening) stopListening();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom duration-200"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-accent-400">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Quick Log
            </h2>
            {isOffline && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full">
                <WifiOff className="h-3 w-3" /> Offline
              </span>
            )}
          </div>

          {/* Mode Switcher: Keypad vs NLP vs Voice vs Scan */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                if (isListening) stopListening();
                setEntryMode("keypad");
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                entryMode === "keypad"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-300"
              )}
            >
              Keypad
            </button>
            <button
              type="button"
              onClick={() => {
                if (isListening) stopListening();
                setEntryMode("nlp");
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all",
                entryMode === "nlp"
                  ? "bg-white dark:bg-zinc-900 text-brand-600 dark:text-accent-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-300"
              )}
            >
              <Zap className="h-3 w-3" /> AI Text
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryMode("voice");
                if (isSpeechSupported && !isListening) {
                  startListening((finalText) => handleVoiceTranscript(finalText));
                }
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all",
                entryMode === "voice"
                  ? "bg-white dark:bg-zinc-900 text-brand-600 dark:text-accent-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-300"
              )}
            >
              <Mic className={cn("h-3 w-3", isListening && "text-rose-500 animate-pulse")} /> Voice
            </button>
            <button
              type="button"
              onClick={() => {
                if (isListening) stopListening();
                fileInputRef.current?.click();
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 text-zinc-500 hover:text-brand-600 dark:hover:text-accent-400 transition-all cursor-pointer"
              title="Snap or upload a receipt photo or ABA / Bakong KHQR payment screenshot"
            >
              <Camera className="h-3 w-3" /> Scan Slip
            </button>
          </div>

          <button
            onClick={handleModalClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Type Segmented Buttons */}
        <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
          {(["expense", "income", "transfer"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
                type === t
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Voice Mode */}
          {entryMode === "voice" ? (
            <div className="space-y-3">
              <div className="relative flex flex-col items-center justify-center p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/80 dark:border-zinc-800 text-center overflow-hidden">
                {/* Background glow when listening */}
                {isListening && (
                  <div className="absolute inset-0 bg-brand-500/5 dark:bg-brand-500/10 animate-pulse pointer-events-none" />
                )}

                {/* Animated Central Mic Button */}
                <div className="relative my-2">
                  {isListening && (
                    <>
                      <span className="absolute -inset-2.5 rounded-full bg-rose-500/25 animate-ping" />
                      <span className="absolute -inset-5 rounded-full bg-rose-500/15 animate-pulse" />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) {
                        stopListening();
                      } else {
                        startListening((finalText) => handleVoiceTranscript(finalText));
                      }
                    }}
                    disabled={!isSpeechSupported}
                    className={cn(
                      "relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer",
                      isListening
                        ? "bg-rose-500 text-white shadow-rose-500/40 ring-4 ring-rose-200 dark:ring-rose-950"
                        : "bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 text-white shadow-brand-600/30 hover:scale-105"
                    )}
                    title={isListening ? "Tap to stop listening" : "Tap to speak"}
                  >
                    {isListening ? (
                      <Mic className="h-7 w-7 animate-pulse" />
                    ) : (
                      <Mic className="h-7 w-7" />
                    )}
                  </button>
                </div>

                {/* Status & Live Speech Bubble */}
                <div className="mt-2 space-y-1.5 w-full max-w-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {isListening
                      ? "Listening... Speak naturally"
                      : transcript
                      ? "Voice Transcript"
                      : isSpeechSupported
                      ? "Tap to Speak Expense"
                      : "Speech recognition not supported in this browser"}
                  </p>

                  {transcript ? (
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 italic bg-white dark:bg-zinc-900 py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm inline-block max-w-full truncate">
                      &ldquo;{transcript}&rdquo;
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <button
                        type="button"
                        onClick={() => handleVoiceTranscript("Coffee $2.50")}
                        className="px-2 py-0.5 rounded-md bg-zinc-200/70 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 transition-colors"
                      >
                        &ldquo;Coffee $2.50&rdquo;
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVoiceTranscript("PassApp 8000 riel")}
                        className="px-2 py-0.5 rounded-md bg-zinc-200/70 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 transition-colors"
                      >
                        &ldquo;PassApp 8000 riel&rdquo;
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVoiceTranscript("Lunch 12 dollars")}
                        className="px-2 py-0.5 rounded-md bg-zinc-200/70 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 transition-colors"
                      >
                        &ldquo;Lunch 12 dollars&rdquo;
                      </button>
                    </div>
                  )}

                  {speechError && (
                    <p className="text-xs font-medium text-rose-500 pt-1">{speechError}</p>
                  )}
                </div>

                {/* Voice Extracted Banner */}
                {amountStr && (
                  <div className="w-full mt-3 p-2.5 bg-brand-50/90 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800/50 rounded-xl text-xs flex items-center justify-between text-brand-900 dark:text-brand-200 text-left animate-in fade-in">
                    <div className="truncate">
                      <span>Voice Extracted: </span>
                      <strong className="tabular-nums">
                        {currency === "USD" ? "$" : "៛"}{amountStr}
                      </strong>{" "}
                      <span>for </span>
                      <strong>{note || "Expense"}</strong>
                    </div>
                    <Badge variant="outline" className="border-brand-500/40 text-[10px] shrink-0 ml-2">
                      {currency}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ) : entryMode === "nlp" ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center justify-between">
                <span>Type or speak: &quot;coffee 2.5&quot; or &quot;taxi 8000 khr&quot;</span>
                <span className="text-[10px] text-accent-600 dark:text-accent-400 font-bold uppercase">AI Smart Parse</span>
              </label>
              <div className="relative">
                <Input
                  ref={nlpInputRef}
                  placeholder="e.g. iced latte 3.50, lunch 12, grab bike 6000 khr"
                  value={nlpText}
                  onChange={(e) => handleNlpChange(e.target.value)}
                  className="text-base py-3 pr-10"
                  autoFocus
                />
                {isSpeechSupported && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) {
                        stopListening();
                      } else {
                        startListening((text) => handleNlpChange(text));
                      }
                    }}
                    className={cn(
                      "absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors",
                      isListening
                        ? "text-rose-500 bg-rose-50 dark:bg-rose-950/60 animate-pulse"
                        : "text-zinc-400 hover:text-brand-600 dark:hover:text-accent-400"
                    )}
                    title={isListening ? "Stop listening" : "Dictate with voice"}
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                )}
              </div>
              {amountStr && (
                <div className="p-3 bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200/50 dark:border-brand-800/40 rounded-xl text-xs flex items-center justify-between text-brand-900 dark:text-brand-200">
                  <span>Detected: <strong>{currency === "USD" ? "$" : "៛"}{amountStr}</strong> for <strong>{note || "Expense"}</strong></span>
                  <Badge variant="outline" className="border-brand-500/40">{currency}</Badge>
                </div>
              )}
            </div>
          ) : (
            /* Keypad Mode (Large numeric focus) */
            <div className="relative flex items-center justify-center p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
              <div className="flex items-baseline gap-2">
                <button
                  type="button"
                  onClick={() => setCurrency(currency === "USD" ? "KHR" : "USD")}
                  className="text-2xl font-bold text-zinc-400 hover:text-brand-600 dark:hover:text-accent-400 transition-colors select-none"
                  title="Tap to switch currency"
                >
                  {currency === "USD" ? "$" : "៛"}
                </button>
                <input
                  ref={inputRef}
                  type="number"
                  step={currency === "USD" ? "0.01" : "100"}
                  min="0"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-48 bg-transparent text-center text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-50 focus:outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => setCurrency(currency === "USD" ? "KHR" : "USD")}
                className="absolute right-4 text-xs font-semibold px-2 py-1 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                {currency}
              </button>
            </div>
          )}

          {/* AI Receipt Scanning Status & Banner */}
          {isScanningReceipt && (
            <div className="p-3 bg-accent-50/80 dark:bg-accent-950/40 border border-accent-200 dark:border-accent-800/60 rounded-xl text-xs flex items-center gap-2.5 text-accent-900 dark:text-accent-200 animate-pulse">
              <Sparkles className="h-4 w-4 text-accent-500 shrink-0 animate-spin" />
              <span>Scanning receipt with AI: reading store, amount, and category...</span>
            </div>
          )}

          {scannedSummary && !isScanningReceipt && (
            <div className="p-3 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs flex items-center justify-between text-emerald-900 dark:text-emerald-200 animate-in fade-in">
              <div className="flex items-center gap-2 truncate">
                {scannedSummary.bankName ? (
                  <Badge variant="default" className="text-[10px] font-bold bg-brand-600 text-white shrink-0 px-2 py-0.5">
                    {scannedSummary.bankName}
                  </Badge>
                ) : (
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                <span className="truncate">
                  {scannedSummary.bankName ? "Payment Extracted: " : "✨ Auto-filled: "}
                  <strong>{scannedSummary.merchant}</strong> •{" "}
                  <strong className="tabular-nums">
                    {currency === "USD" ? "$" : "៛"}{scannedSummary.amount}
                  </strong>{" "}
                  • {scannedSummary.category}
                </span>
              </div>
              <Badge variant="outline" className="border-emerald-500/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0 ml-2">
                {scannedSummary.bankName
                  ? "KHQR Slip"
                  : scannedSummary.source === "gemini_vision"
                  ? "Gemini AI"
                  : "Smart OCR"}
              </Badge>
            </div>
          )}

          {/* Categories Grid (Large tap targets for 5s logging) */}
          {type === "expense" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categoriesList.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-xl border text-left text-xs font-medium transition-all",
                        isSelected
                          ? "border-brand-600 bg-brand-50/70 text-brand-900 ring-1 ring-brand-500 dark:border-accent-500 dark:bg-brand-950/40 dark:text-accent-200"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      <span
                        className="w-5 h-5 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <Icon className="h-3 w-3" />
                      </span>
                      <span className="truncate text-[11px]">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note & Receipt Upload Row (Spec 3.4 #22) */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs flex-1"
              maxLength={100}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            <Button
              type="button"
              variant={receiptImage ? "default" : "outline"}
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              title="Attach receipt photo"
              className="shrink-0 h-10 w-10 rounded-xl"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          {/* Receipt Preview if attached */}
          {receiptImage && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium truncate">
                <ImageIcon className="h-3.5 w-3.5 text-accent-500 shrink-0" />
                {isUploadingReceipt
                  ? "Uploading to Supabase Storage..."
                  : remoteReceiptUrl
                  ? "Receipt stored in Supabase"
                  : "Receipt photo attached"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setReceiptImage(null);
                  setRemoteReceiptUrl(null);
                }}
                className="text-rose-500 hover:text-rose-700 text-xs font-semibold px-1"
              >
                Remove
              </button>
            </div>
          )}

          {errorMessage && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
              {errorMessage}
            </p>
          )}

          {/* Submit Action */}
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full text-base font-semibold shadow-md shadow-brand-600/20"
          >
            {isSubmitting
              ? "Saving..."
              : isOffline
              ? "Save Offline (Queued)"
              : "Save Expense"}
          </Button>
        </form>
      </div>
    </div>
  );
}
