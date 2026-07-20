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
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { StatusBadge } from "@/components/campaign/StatusBadge";
import { setMemberBan, setMemberVerification } from "@/lib/actions/admin";

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
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banDays, setBanDays] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  // Normalized the same way X handles are treated everywhere else on this
  // site — leading "@" ignored, case-insensitive.
  const normalizedSearch = search.trim().replace(/^@/, "").toLowerCase();
  const filteredMembers = normalizedSearch
    ? members.filter((m) => m.xHandle.toLowerCase().includes(normalizedSearch))
    : members;

  async function handleVerify(profileId: string, status: (typeof VERIFICATION_STATUSES)[number]) {
    setError(null);
    setPendingId(profileId);
    const result = await setMemberVerification({ profileId, status });
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
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
        const isSelfOrAdmin = member.id === currentUserId || member.role === "admin";
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

            {!isSelfOrAdmin && (
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
                    {s}
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
                      Ban
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
