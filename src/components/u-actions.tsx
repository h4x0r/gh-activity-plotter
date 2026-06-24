"use client";

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** "Plot your own" username box + copy-the-README-embed button — the viral loop:
 *  a viewer types any handle and instantly gets a chart to share. */
export function UActions({ embed }: { embed: string }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [copied, setCopied] = useState(false);

  const go = () => {
    const u = handle.trim().replace(/^@/, "");
    if (u) router.push(`/u/${encodeURIComponent(u)}`);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(embed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — no-op
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="any GitHub username"
          aria-label="GitHub username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button onClick={go}>Plot →</Button>
      </div>
      <button
        type="button"
        onClick={copy}
        className="border-input bg-muted/40 text-muted-foreground hover:text-foreground flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left font-mono text-xs"
        title="Copy the README embed"
      >
        <span className="truncate">{embed}</span>
        {copied ? (
          <Check className="size-4 shrink-0 text-emerald-500" />
        ) : (
          <Copy className="size-4 shrink-0" />
        )}
      </button>
      <p className="text-muted-foreground/70 text-xs">
        Paste that into your GitHub profile README — it stays live.
      </p>
    </div>
  );
}
