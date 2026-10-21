"use client";

import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { scorePassword } from "./password-strength";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

/** Password field with a lock icon and a show/hide toggle. */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const t = useT("auth");
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pl-10 pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

const STRENGTH_STYLES = [
  { key: "strengthWeak", bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  { key: "strengthWeak", bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  { key: "strengthFair", bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { key: "strengthGood", bar: "bg-accent-500", text: "text-accent-600 dark:text-accent-400" },
  { key: "strengthStrong", bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
] as const;

/** Four-segment strength bar shown under the new password field. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const t = useT("auth");
  if (!password) {
    return <p className="text-[11px] text-zinc-500">{t("passwordHint")}</p>;
  }
  const score = scorePassword(password);
  const style = STRENGTH_STYLES[score];
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= Math.max(score, 1) ? style.bar : "bg-zinc-200 dark:bg-zinc-800"
            )}
          />
        ))}
      </div>
      <p className="flex justify-between text-[11px]">
        <span className="text-zinc-500">{score === 0 ? t("passwordTooShortDesc") : t("passwordHint")}</span>
        <span className={cn("shrink-0 pl-2 font-semibold", style.text)}>{t(style.key)}</span>
      </p>
    </div>
  );
}
