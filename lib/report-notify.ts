import { captureServerError } from "@/lib/observability";
import { getAppUrl } from "@/lib/utils";

type NotifyNewReportInput = {
  reportId: string;
  battleId: string;
  reason: string;
  battleTitle: string;
  battleSlug: string;
};

export function isReportNotifyConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.REPORT_NOTIFY_EMAIL && process.env.RESEND_FROM_EMAIL);
}

export async function notifyNewReport(input: NotifyNewReportInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.REPORT_NOTIFY_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    return;
  }

  const battleUrl = getAppUrl(`/b/${input.battleSlug}`);
  const adminUrl = getAppUrl("/admin/reports");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `MemeFight Report: ${input.battleTitle}`,
      html: [
        `<p><strong>Neuer Battle-Report</strong></p>`,
        `<p><strong>Battle:</strong> ${escapeHtml(input.battleTitle)}</p>`,
        `<p><strong>Grund:</strong> ${escapeHtml(input.reason)}</p>`,
        `<p><a href="${battleUrl}">Battle ansehen</a></p>`,
        `<p><a href="${adminUrl}">Moderation öffnen</a></p>`,
        `<p style="color:#666;font-size:12px">Report-ID: ${input.reportId}</p>`,
      ].join(""),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    captureServerError("report-notify", new Error(`Resend failed: ${response.status}`), {
      battleId: input.battleId,
      body: body.slice(0, 200),
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
