"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";

type BattleReportButtonProps = {
  battleId: string;
};

export function BattleReportButton({ battleId }: BattleReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit() {
    if (reason.trim().length < 3) return;

    setStatus("loading");
    const response = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ battleId, reason: reason.trim() }),
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    setStatus("done");
    setOpen(false);
    setReason("");
  }

  if (status === "done") {
    return <p className="text-center text-sm text-muted-foreground">Danke — Meldung erhalten.</p>;
  }

  return (
    <div className="text-center">
      {!open ? (
        <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <Flag className="h-4 w-4" />
          Melden
        </Button>
      ) : (
        <div className="mx-auto max-w-md space-y-3 rounded-xl border border-border bg-card p-4 text-left">
          <p className="text-sm font-medium">Battle melden</p>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Warum ist dieser Inhalt problematisch?"
            className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            maxLength={500}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" size="sm" disabled={status === "loading"} onClick={handleSubmit}>
              Senden
            </Button>
          </div>
          {status === "error" && (
            <p className="text-sm text-destructive">Meldung fehlgeschlagen. Bitte erneut versuchen.</p>
          )}
        </div>
      )}
    </div>
  );
}
