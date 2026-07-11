import "server-only";

/**
 * Discord admin notification (webhook).
 * -------------------------------------
 * After a successful application insert, we POST a styled embed "card" to a
 * Discord channel webhook so the mods see new applicants in real time. This is
 * the lightweight stand-in for the full Phase 2 bot (no Approve/Reject buttons
 * yet — just visibility).
 *
 * Two hard rules:
 *   1. FAIL-SAFE. A webhook problem must NEVER turn a real applicant's success
 *      into an error. Everything here is wrapped so it can't throw to the
 *      caller; on any failure we just log server-side and move on.
 *   2. The webhook URL is a secret. It's read from DISCORD_WEBHOOK_URL (no
 *      NEXT_PUBLIC_ prefix) and never reaches the browser. If it's unset (e.g.
 *      local dev), we simply skip the notification.
 */

const GOLD = 0xd4af37; // Alpha Vault gold, as a Discord embed color int.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://alphavaultx.netlify.app";

export interface NewApplicationNotice {
  id: string;
  createdAt: string;
  discordUsername: string;
  xHandle?: string | null;
  role: string;
  workUrl: string;
  note?: string | null;
}

/**
 * Build the exact JSON body Discord expects. Pure and side-effect-free so it
 * can be unit-tested without hitting the network. Optional fields (X handle,
 * note) are omitted entirely when empty — Discord rejects empty field values.
 */
export function buildApplicationWebhookBody(app: NewApplicationNotice) {
  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "Discord", value: app.discordUsername, inline: true },
    { name: "Role", value: app.role, inline: true },
  ];

  if (app.xHandle) {
    fields.push({ name: "X", value: `@${app.xHandle}`, inline: true });
  }

  // Full-width rows. Raw URL (not a masked link) so mods can see exactly where
  // it points before clicking — part of the vetting.
  fields.push({ name: "Work", value: app.workUrl });

  if (app.note) {
    fields.push({ name: "Note", value: app.note });
  }

  return {
    username: "Alpha Vault",
    avatar_url: `${SITE_URL}/vault-mark.png`,
    // Plain content line so mobile push previews show something useful.
    content: "**New application received**",
    embeds: [
      {
        title: "New application",
        color: GOLD,
        fields,
        footer: { text: `Application ${app.id.slice(0, 8)}` },
        timestamp: app.createdAt,
      },
    ],
  };
}

/**
 * Send the notification. Never throws. Returns true if Discord accepted it,
 * false otherwise (including when no webhook is configured).
 */
export async function notifyNewApplication(
  app: NewApplicationNotice,
): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    // Not configured — silently skip so local/dev submissions still succeed.
    return false;
  }

  // Don't let a slow/hanging Discord hold up the applicant's response.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildApplicationWebhookBody(app)),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        "[apply] discord webhook returned",
        res.status,
        detail.slice(0, 300),
      );
      return false;
    }
    return true;
  } catch (err) {
    // Timeout, network error, malformed URL — all land here. Log, don't throw.
    console.error("[apply] discord webhook failed:", err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
