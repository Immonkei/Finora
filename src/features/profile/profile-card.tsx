"use client";

import * as React from "react";
import { BadgeCheck, Check, Pencil, User, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";
import { initials, saveDisplayName, useProfile } from "./use-profile";

/** Settings › Account: who is signed in, how, and an editable display name. */
export function ProfileCard() {
  const t = useT("settings");
  const tc = useT("common");
  const { profile, reload } = useProfile();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const startEdit = () => {
    setDraft(profile?.fullName ?? "");
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (draft.trim().length < 2) {
      toast.error(t("nameTooShort"));
      return;
    }
    setSaving(true);
    const res = await saveDisplayName(profile.id, draft);
    setSaving(false);
    if (res.success) {
      toast.success(t("nameSaved"));
      setEditing(false);
      reload();
    } else {
      toast.error(t("nameSaveFailed"), { description: res.error });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4 text-brand-600 dark:text-accent-400" /> {t("profileTitle")}
        </CardTitle>
        <CardDescription>{t("profileDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
          {profile?.avatarUrl ? (
            // Google profile photos are on an external host; a plain img avoids image-domain config
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white">
              {initials(profile?.fullName, profile?.email)}
            </span>
          )}

          <div className="min-w-0 flex-1">
            {editing ? (
              <form onSubmit={handleSave} className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  autoComplete="name"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={60}
                  aria-label={t("displayName")}
                  className="h-9 min-w-0 flex-1"
                />
                <Button type="submit" size="icon" disabled={saving} className="h-9 w-9 shrink-0" aria-label={tc("save")}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  className="h-9 w-9 shrink-0"
                  aria-label={tc("cancel")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <button
                type="button"
                onClick={startEdit}
                disabled={!profile}
                className="group flex max-w-full items-center gap-1.5 text-left cursor-pointer"
                aria-label={t("editName")}
              >
                <span className="truncate text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {profile ? profile.fullName || t("noNameYet") : tc("loading")}
                </span>
                <Pencil className="h-3.5 w-3.5 shrink-0 text-zinc-400 group-hover:text-brand-600" />
              </button>
            )}
            <p className="mt-0.5 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {profile?.email ?? ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
          <span className="text-zinc-500">
            {t("signInMethod")}:{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {profile?.provider === "google" ? t("methodGoogle") : t("methodEmail")}
            </span>
          </span>
          {profile && (
            <Badge
              variant={profile.emailVerified ? "brand" : "outline"}
              className="gap-1 whitespace-nowrap text-xs"
            >
              {profile.emailVerified && <BadgeCheck className="h-3.5 w-3.5" />}
              {profile.emailVerified ? t("emailVerified") : t("emailUnverified")}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
