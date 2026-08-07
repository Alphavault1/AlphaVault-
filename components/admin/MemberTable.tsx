"use client";

/**
 * MemberTable
 * -----------
 * Admin rows (and the viewing admin's own row) never show ban/verify
 * controls at all — not because the buttons would silently fail, but
 * because the RPCs underneath already refuse these exact cases
 * (set_member_ban / set_member_verification both guard against
 * self-targeting and admin-targeting). Hiding the control entirely, rather
 * than showing a button that's guaranteed to return an error, is the better
 * UX for something that can never succeed.
 *
 * OPTIMISTIC UPDATES — why this file now holds its own copy of `members`:
 * Reported bug: clicking Approve/Reject took 2-4 clicks to "work." Root
 * cause: every handler here disabled its button, awaited the server action,
 * then IMMEDIATELY re-enabled the button and called router.refresh() —
 * which returns void and cannot be awaited (confirmed against Next's own
 * type definitions: `refresh(): void`). That means the button became
 * clickable again well before the page's visible data had actually
 * refreshed, so a second click looked necessary even though the first one
 * had already succeeded.
 *
 * The "obvious" fix (wrap refresh in useTransition and gate on isPending)
 * was deliberately NOT used here — it has a confirmed, currently open
 * Next.js regression (vercel/next.js#86055) where isPending can get stuck
 * true forever in PRODUCTION builds specifically, which is worse than the
 * bug being fixed. Instead: patch the affected member's fields in local
 * state the instant the action succeeds, independent of refresh timing
 * entirely. router.refresh() still runs afterward to reconcile with the
 * server (e.g. if another admin changed something else), but the person
 * who clicked never has to wait for it to see their own click take effect.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { StatusBadge } from "@/components/campaign/StatusBadge";
import { setMemberBan, setMemberVerification, setMemberRole } from "@/lib/actions/admin";

export interface MemberRow {
  id: string;
  xHandle: string;
  role: string;
  status: string;
  bannedUntil: string | null;
  totalEarnings: number;
}

const VERIFICATION_STATUSES = ["pending", "approved", "rejected"] as const;

export function MemberTable({
  members,
  currentUserId,
}: {
  members: MemberRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [localMembers, setLocalMembers] = useState(members);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banDays, setBanDays] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  // Reconciles with fresh server data once router.refresh() actually lands.
  // Safe to just overwrite: by the time this fires after a successful
  // action, the optimistic patch below already set the same target value,
  // so this just re-confirms it rather than fighting it. If the change came
  // from somewhere else entirely (another admin, a manual reload), this is
  // exactly the mechanism that should bring it in.
  useEffect(() => {
    setLocalMembers(members);
  }, [members]);

  // Normalized the same way X handles are treated everywhere else on this
  // site — leading "@" ignored, case-insensitive.
  const normalizedSearch = search.trim().replace(/^@/, "").toLowerCase();
  const filteredMembers = normalizedSearch
    ? localMembers.filter((m) => m.xHandle.toLowerCase().includes(normalizedSearch))
    : localMembers;

  function patchMember(profileId: string, patch: Partial<MemberRow>) {
    setLocalMembers((prev) => prev.map((m) => (m.id === profileId ? { ...m, ...patch } : m)));
  }

  async function handleVerify(profileId: string, status: (typeof VERIFICATION_STATUSES)[number]) {
    setError(null);
    setPendingId(profileId);
    const result = await setMemberVerification({ profileId, status });
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    patchMember(profileId, { status });
    router.refresh();
  }

  async function handleBan(profileId: string, days: number) {
    if (days > 0) {
      const confirmed = window.confirm(`Ban this member for ${days} day(s)?`);
      if (!confirmed) return;
    }
    setError(null);
    setPendingId(profileId);
    const result = await setMemberBan({ profileId, days });
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Approximate — refresh() will bring the server's exact timestamp
    // moments later. Good enough for "is this member currently banned,
    // yes or no," which is the only thing the UI actually branches on.
    patchMember(profileId, {
      bannedUntil: days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
    });
    router.refresh();
  }

  async function handleRoleChange(profileId: string, role: "creator" | "admin") {
    const isRemovingOwnAccess = role === "creator" && profileId === currentUserId;
    const confirmed = window.confirm(
      role === "admin"
        ? "Make this member an admin? They'll get full access to the campaign dashboard."
        : isRemovingOwnAccess
          ? "Remove your OWN admin access? You'll be signed out of the admin dashboard immediately — make sure another admin can already get in."
          : "Remove admin access from this member?",
    );
    if (!confirmed) return;
    setError(null);
    setPendingId(profileId);
    const result = await setMemberRole({ profileId, role });
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    patchMember(profileId, { role });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Filter by X handle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black py-2.5 pl-10 pr-4 font-body text-sm text-white placeholder:text-muted focus:border-gold focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="font-body text-sm text-red-400">
          {error}
        </p>
      )}

      {filteredMembers.length === 0 && (
        <p className="rounded-2xl border border-white/5 bg-surface-900 p-8 text-center font-body text-slate">
          No members match &ldquo;{search}&rdquo;.
        </p>
      )}

      {filteredMembers.map((member) => {
        const isSelf = member.id === currentUserId;
        // No longer excludes self — the RPC allows demoting yourself as
        // long as at least one other admin exists, so the button should be
        // visible for your own admin row too. If you happen to be the last
        // admin, the RPC's own "Cannot remove the last remaining admin"
        // error surfaces naturally rather than the UI trying to predict it.
        const isAdminRow = member.role === "admin";
        const canManageVerificationAndBan = !isSelf && member.role !== "admin";
        const isBanned = member.bannedUntil && new Date(member.bannedUntil) > new Date();
        const busy = pendingId === member.id;

        return (
          <div
            key={member.id}
            className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-surface-900 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <p className="font-body font-semibold text-white">@{member.xHandle}</p>
                <StatusBadge status={member.role === "admin" ? "admin" : member.status} />
                {isBanned && <StatusBadge status="banned" />}
              </div>
              <p className="mt-1 font-body text-xs text-muted">
                ${member.totalEarnings.toLocaleString()} earned
              </p>
            </div>

            {canManageVerificationAndBan && (
              <div className="flex flex-wrap items-center gap-2">
                {VERIFICATION_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleVerify(member.id, s)}
                    disabled={busy || member.status === s}
                    className={`rounded-full border px-3 py-1.5 font-body text-xs uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      member.status === s
                        ? "border-gold bg-gold text-black"
                        : "border-white/15 text-slate hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : s}
                  </button>
                ))}

                {isBanned ? (
                  <button
                    type="button"
                    onClick={() => handleBan(member.id, 0)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 font-body text-xs text-white transition-colors hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : "Unban"}
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      placeholder="Days"
                      value={banDays[member.id] ?? ""}
                      onChange={(e) =>
                        setBanDays((prev) => ({ ...prev, [member.id]: e.target.value }))
                      }
                      className="w-16 rounded-full border border-white/10 bg-black px-2 py-1.5 text-center font-body text-xs text-white focus:border-gold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const days = Number(banDays[member.id] ?? 0);
                        if (days > 0) handleBan(member.id, days);
                      }}
                      disabled={busy || !banDays[member.id]}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 font-body text-xs text-white transition-colors hover:border-red-500/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy ? <Loader2 size={12} className="animate-spin" /> : "Ban"}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleRoleChange(member.id, "admin")}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-full border border-gold/30 px-3 py-1.5 font-body text-xs text-gold transition-colors hover:border-gold/60 hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : "Make admin"}
                </button>
              </div>
            )}

            {isAdminRow && (
              <button
                type="button"
                onClick={() => handleRoleChange(member.id, "creator")}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 font-body text-xs text-white transition-colors hover:border-red-500/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : "Remove admin"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
