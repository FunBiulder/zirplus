import { SectionTitle } from "./SectionTitle";

const PLEDGES = [
  { title: "Every fill is itemised", body: "Mid, spread, skew and fee are separate fields in the fill event, matching the ticket line for line.", check: "Open any fill on Blockscout and compare it with its ticket." },
  { title: "Nothing settles outside the band", body: "The band is a contract check on both the vault path and RFQ, not a promise in a policy page.", check: "Run the fuzz and invariant tests in contracts/test." },
  { title: "Best verifiable price wins", body: "The router compares the vault quote with any maker quote on-chain and settles the better one.", check: "Call previewExactIn with the same inputs and compare." },
  { title: "No custody, anywhere", body: "Settlement is atomic, and vault inventory belongs to LPs. Between trades the venue holds nothing.", check: "Read SwapRouter: it has no owner and no sweep function." },
  { title: "Exits are unconditional", body: "Withdrawals are pro-rata and in kind, and they work halted, paused, retired or with an expired attestation.", check: "See the withdrawal-in-every-state tests." },
  { title: "Parameters are timelocked", body: "Spreads, bands, caps, fees and eligibility changes are scheduled, wait out 48 hours and only then execute. Oracle settings are not timelocked yet.", check: "Follow ParamController's schedule and execute events." },
  { title: "The guardian can only pause swaps", body: "Deposits, withdrawals and RFQ cancellations sit outside anyone's pause button.", check: "Read ParamController: the guardian role can call one thing, the swap pause." },
  { title: "Open source, no proxies", body: "The router, vaults, factory and RFQ settlement have no upgrade path. New versions are new deployments.", check: "Verify the bytecode against this repository." },
];

/** Eight pledges as a sideways-scrolling deck of tall cards, each ending with how to check it. */
export function Pledges() {
  return (
    <section id="pledges" className="scroll-mt-6 pt-[clamp(64px,10vw,140px)]">
      <div className="frame">
        <div className="inner">
          <SectionTitle
            tone="dark"
            kicker="06 · Pledges"
            title="Eight things we promise, and how to check each one"
            lead="Saying 'transparent' is free. These are commitments you can test yourself. If one ever fails its check, we treat it as an incident and publish what happened."
          />
        </div>
      </div>

      <div className="scrollbar-none mt-12 overflow-x-auto pb-6">
        <ol className="flex w-max snap-x snap-mandatory gap-4 px-[max(20px,calc((100vw-1220px)/2+56px))]">
          {PLEDGES.map((p, i) => (
            <li key={p.title} className="flex w-[300px] shrink-0 snap-start flex-col justify-between rounded-[26px] bg-zp-stage p-7 text-zp-fg shadow-[0_24px_50px_-30px_rgb(60_30_20/0.6)] sm:w-[320px]">
              <div>
                <span className="pastel-text font-display text-[46px] font-extralight leading-none">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 font-display text-[21px] font-normal leading-snug">{p.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-zp-fg-2">{p.body}</p>
              </div>
              <p className="mt-8 border-t border-zp-line pt-4 text-[13px] leading-relaxed text-zp-fg-3">
                <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-zp-peach">Check</span> {p.check}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
