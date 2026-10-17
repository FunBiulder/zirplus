"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, UserRound } from "lucide-react";
import { useSession } from "@/components/platform/PlatformProviders";
import { RequireAuth } from "@/components/platform/PlatformShell";
import { useAsync } from "@/components/platform/usePlatformData";
import { Badge, Button, Field, Input, Notice, PageHead, Skeleton } from "@/components/platform/ui";
import { getMyAttestations, upsertProfile } from "@/lib/platform/queries";
import { fmtDate, friendlyError } from "@/lib/platform/format";
import { platformEnv } from "@/lib/platform/env";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <div>
      <PageHead code="Account" title="You, and what you may do" description="Your private profile on the left, your on-chain permissions on the right." />
      <div className="mt-10">
        <RequireAuth title="Sign in to manage your account">
          <Settings />
        </RequireAuth>
      </div>
    </div>
  );
}

const ROLES = ["TRADER", "LP", "MAKER", "RELAYER"] as const;

const ROLE_HINTS: Record<(typeof ROLES)[number], string> = {
  TRADER: "Swap on the venue",
  LP: "Fund vaults and hold their shares",
  MAKER: "Answer RFQs with signed quotes",
  RELAYER: "Submit swaps on behalf of users",
};

const readOnlyField = "cursor-default border-zp-line bg-transparent text-zp-fg-3 focus:border-zp-line";

function Settings() {
  const { api, userId, walletAddress, email, profile, refreshProfile } = useSession();
  const attestations = useAsync(() => getMyAttestations(api), [api, userId]);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      await upsertProfile(api, { display_name: displayName || null, wallet_address: walletAddress, email });
      await refreshProfile();
      setMsg("Saved.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section id="profile" aria-labelledby="profile-title" className="rounded-[30px] border border-zp-line bg-zp-ink/40 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 id="profile-title" className="flex items-center gap-2.5 font-display text-[22px] text-zp-fg">
            <UserRound className="size-5 text-zp-peach" aria-hidden="true" />
            Profile
          </h2>
          <span className="text-[12.5px] text-zp-fg-3">visible only to you</span>
        </div>

        <form onSubmit={save} className="mt-6">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
            <Field label="Display name" hint="Just for you. The public explorer always shows addresses, never names.">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Wallet">
              <Input value={walletAddress ?? ""} readOnly className={cn("font-mono text-[13px]", readOnlyField)} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Email">
                <Input value={email ?? ""} readOnly className={readOnlyField} />
              </Field>
              <Field label="User ID">
                <Input value={userId ?? ""} readOnly className={cn("font-mono text-[12px]", readOnlyField)} />
              </Field>
            </div>
          </div>
          {(msg || error) && (
            <div className="mt-5 space-y-3">
              {msg && <Notice>{msg}</Notice>}
              {error && <Notice tone="error">{error}</Notice>}
            </div>
          )}
          <div className="mt-7 flex justify-end">
            <Button type="submit" disabled={saving} className="btn-sm">
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      </section>

      <section id="eligibility" aria-labelledby="elig-title" className="rounded-[30px] bg-zp-paper p-6 text-zp-paper-ink sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 id="elig-title" className="flex items-center gap-2.5 font-display text-[22px]">
            <ShieldCheck className="size-5" aria-hidden="true" />
            Eligibility
          </h2>
          <span className="text-[12.5px] text-zp-paper-ink/60">no personal data on-chain</span>
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-zp-paper-ink/75">
          A KYC provider issues these to your wallet once identity, sanctions and residency checks pass. The registry stores only
          the role, a jurisdiction class and an expiry date.
        </p>

        {attestations.loading && !attestations.data ? (
          <div className="mt-6">
            <Skeleton rows={4} />
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {ROLES.map((role) => {
              const a = attestations.data?.find((x) => x.role === role && x.status === "active" && new Date(x.expires_at) > new Date());
              return (
                <li key={role} className={cn("rounded-[20px] p-4", a ? "bg-zp-ink text-zp-fg" : "border border-zp-paper-ink/15")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[13px] font-medium">{role}</span>
                    {a ? <Badge tone="up">Active</Badge> : <span className="text-[11.5px] text-zp-paper-ink/55">Not issued</span>}
                  </div>
                  <p className={cn("mt-2 text-[12.5px]", a ? "text-zp-fg-3" : "text-zp-paper-ink/65")}>
                    {a ? (
                      <>
                        <span className="font-mono">{a.jurisdiction_class ?? "?"}</span> · class{" "}
                        <span className="font-mono">{a.investor_class ?? "?"}</span> · until{" "}
                        <span className="font-mono">{fmtDate(a.expires_at)}</span>
                      </>
                    ) : (
                      ROLE_HINTS[role]
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-6 text-[12.5px] leading-relaxed text-zp-paper-ink/60">
          Each attestation is mirrored in the EligibilityRegistry on {platformEnv.chainName}. None is ever needed to withdraw from
          a vault. To start onboarding, contact the team.
        </p>
      </section>
    </div>
  );
}
