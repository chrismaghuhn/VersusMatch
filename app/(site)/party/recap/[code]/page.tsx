import type { Metadata } from "next";
import Link from "next/link";
import { PartyErrorState } from "@/components/brutal/party/party-error-state";
import { ShareCard } from "@/components/brutal/party/screens/ShareCard";
import { Shell } from "@/components/brutal/party/shared/Shell";
import {
  parsePartyRecap,
  parsePartyRecapTemplateId,
  toPartyTemplateViewFromRecap,
  type ShareCardData,
} from "@/lib/party/share-card-data";
import { createClient } from "@/lib/supabase/server";
import { partyGetRecapRpc } from "@/lib/supabase/party-rpc";
import { getAppUrl } from "@/lib/utils";
import { PARTY_COPY } from "@/lib/party/copy";

type PageProps = { params: Promise<{ code: string }> };

type RecapLoadResult =
  | {
      ok: true;
      data: ShareCardData;
      code: string;
      title: string;
      description: string;
    }
  | { ok: false; error: "not_finished" | "not_found" | "unknown"; code: string };

function winnerTitle(data: ShareCardData): string {
  if (data.gameWinners.length === 1) {
    return `@${data.gameWinners[0]!.handle} wins · MemeFight Party`;
  }
  if (data.gameWinners.length > 1) {
    return `${data.gameWinners.length}-way tie · MemeFight Party`;
  }
  return "MemeFight Party recap";
}

async function loadRecap(code: string): Promise<RecapLoadResult> {
  const supabase = await createClient();
  const { data, error } = await partyGetRecapRpc(supabase, code);
  if (error) {
    return { ok: false, error: "unknown", code };
  }

  const parsed = parsePartyRecap(data);
  if (!parsed.ok) {
    if (parsed.error === "not_finished" || parsed.error === "not_found") {
      return { ok: false, error: parsed.error, code };
    }
    return { ok: false, error: "unknown", code };
  }

  let template = null;
  const templateId = parsePartyRecapTemplateId(data);
  if (templateId) {
    const { data: templateRow } = await supabase
      .from("party_templates")
      .select("id, image_path, text_boxes")
      .eq("id", templateId)
      .maybeSingle();
    if (templateRow) {
      template = toPartyTemplateViewFromRecap(templateRow);
    }
  }

  const withTemplate = parsePartyRecap(data, template);
  if (!withTemplate.ok) {
    return { ok: false, error: "unknown", code };
  }

  const title = winnerTitle(withTemplate.data);
  const description = `${withTemplate.data.roundCount} rounds · Room ${withTemplate.data.roomCode}`;

  return {
    ok: true,
    data: withTemplate.data,
    code,
    title,
    description,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();
  const recap = await loadRecap(normalized);
  if (!recap.ok) {
    return {
      title: "Party recap · MemeFight",
      description: "Public game recap for MemeFight Party.",
      alternates: { canonical: getAppUrl(`/party/recap/${normalized}`) },
      openGraph: {
        type: "website",
        title: "Party recap · MemeFight",
        description: "Public game recap for MemeFight Party.",
        url: getAppUrl(`/party/recap/${normalized}`),
      },
    };
  }

  const recapUrl = getAppUrl(`/party/recap/${recap.code}`);
  return {
    title: recap.title,
    description: recap.description,
    alternates: { canonical: recapUrl },
    openGraph: {
      type: "website",
      title: recap.title,
      description: recap.description,
      url: recapUrl,
    },
  };
}

function RecapError({ code, error }: { code: string; error: "not_finished" | "not_found" | "unknown" }) {
  const errorCode = error === "not_found" ? "not_found" : "unknown";
  const title = error === "not_finished" ? "Recap not ready yet." : null;
  const bodyText =
    error === "not_finished" ? "This party is still running. Recap unlocks after the game ends." : null;

  return (
    <Shell>
      <div className="mx-auto max-w-lg px-6 py-16">
        <PartyErrorState code={errorCode} roomCode={code} compact />
        {title ? (
          <h2 className="mt-4 text-white" style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em" }}>
            {title}
          </h2>
        ) : null}
        {bodyText ? (
          <p className="mt-4 text-sm text-white/60">{bodyText}</p>
        ) : null}
      </div>
    </Shell>
  );
}

export default async function PartyRecapPage({ params }: PageProps) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();
  const recap = await loadRecap(normalized);

  if (!recap.ok) {
    return <RecapError code={normalized} error={recap.error} />;
  }

  return (
    <Shell>
      <div className="mx-auto max-w-lg px-6 py-12">
        <div className="mb-6">
          <div
            className="text-white/40"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em" }}
          >
            ━━ PUBLIC RECAP
          </div>
          <h1
            className="mt-2 text-white"
            style={{
              fontWeight: 900,
              fontSize: "clamp(32px, 6vw, 52px)",
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
            }}
          >
            {winnerTitle(recap.data)}
          </h1>
          <p className="mt-2 text-white/60" style={{ fontSize: 14 }}>
            {recap.data.roundCount} rounds · room {recap.data.roomCode}
          </p>
        </div>

        <ShareCard data={recap.data} embedded={false} wrapInShell={false} showPngDownload={false} />
        <p className="mt-4 text-white/50 break-all" style={{ fontSize: 12 }}>
          {PARTY_COPY.recapPublicDisclosure(getAppUrl(`/party/recap/${recap.data.roomCode}`))}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/party"
            className="flex items-center justify-center bg-[#CCFF00] py-4 text-black hover:bg-white"
            style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.18em" }}
          >
            PLAY MEMEFIGHT PARTY
          </Link>
          <Link
            href={`/party/join/${recap.data.roomCode}`}
            className="flex items-center justify-center border border-white/20 py-4 text-white hover:border-[#CCFF00] hover:text-[#CCFF00]"
            style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.18em" }}
          >
            JOIN THIS CREW
          </Link>
        </div>
      </div>
    </Shell>
  );
}
