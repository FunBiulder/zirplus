"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  createPublicClient,
  createWalletClient,
  custom,
  erc20Abi,
  http,
  keccak256,
  parseUnits,
  toHex,
  zeroAddress,
  type PublicClient,
} from "viem";
import { useSession } from "./PlatformProviders";
import { robinhoodChain } from "@/lib/platform/chain";
import { platformEnv } from "@/lib/platform/env";
import { DEPLOYMENT } from "@/lib/platform/deployment";
import { ELIGIBILITY_REGISTRY_ABI, SWAP_ROUTER_ABI } from "@/lib/platform/abi";
import type { VaultMarket } from "@/lib/platform/markets";

const addressOf = (name: string) =>
  (DEPLOYMENT.contracts.find((c) => c.name === name)?.address ?? DEPLOYMENT.dependencies.find((c) => c.name === name)?.address) as `0x${string}`;

const ROUTER = addressOf("SwapRouter");
const REGISTRY = addressOf("EligibilityRegistry");
const USDG = addressOf("USDG");
const USDG_DECIMALS = 6;
const TRADER_ROLE = keccak256(toHex("zirplus.role.TRADER"));

const EMPTY_QUOTE = {
  maker: zeroAddress,
  tokenIn: zeroAddress,
  tokenOut: zeroAddress,
  amountIn: BigInt(0),
  amountOut: BigInt(0),
  taker: zeroAddress,
  expiry: 0,
  nonce: BigInt(0),
} as const;

let reader: PublicClient | null = null;
function getReader(): PublicClient {
  reader ??= createPublicClient({ chain: robinhoodChain, transport: http(platformEnv.chainRpc || undefined) });
  return reader;
}

const FRIENDLY: Record<string, string> = {
  NoLiquidity: "The vault has no liquidity for this trade yet.",
  MarketHalted: "This market is halted right now (stale feed, corporate action or a big price move).",
  NotEligible: "Your wallet needs a TRADER attestation before it can trade.",
  SwapsPaused: "Swaps are paused by the guardian.",
  ClipExceeded: "This trade is larger than the session's maximum size.",
  Expired: "The swap took too long to confirm. Try again.",
  ZeroAmount: "Enter an amount.",
  InsufficientInventory: "The vault doesn't hold enough of that token for this size. Try a smaller amount.",
  InventoryBandExceeded: "This trade would push the vault outside its inventory band. Try the other direction or a smaller size.",
  DailyCapExceeded: "This market has reached today's volume cap.",
  BandExceeded: "The quote would fall outside the oracle band, so the venue refuses it.",
  ERC20InsufficientBalance: "Your wallet doesn't hold enough of the token you're paying with.",
};

/** Turns a viem error into one sentence a trader can act on. */
export function describeSwapError(e: unknown): string {
  if (e instanceof BaseError) {
    if (e.walk((x) => x instanceof UserRejectedRequestError)) return "You cancelled the request in your wallet.";
    const reverted = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName ?? "";
      if (FRIENDLY[name]) return FRIENDLY[name];
      if (/slippage|minout|insufficientoutput/i.test(name)) return "The price moved past your slippage bound, so nothing was traded.";
      if (name) return `The contract rejected the swap (${name}).`;
    }
    if (/insufficient funds/i.test(e.message)) return "Your wallet needs a little ETH on Robinhood Chain to pay gas.";
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}

function toUnits(raw: string, decimals: number): bigint | null {
  const clean = raw.replace(/,/g, "").trim();
  if (!/^\d*\.?\d*$/.test(clean) || clean === "" || clean === ".") return null;
  try {
    const v = parseUnits(clean, decimals);
    return v > BigInt(0) ? v : null;
  } catch {
    return null;
  }
}

export type SwapStage = "idle" | "approving" | "swapping" | "done";

export interface OnchainSwap {
  /** Whether this market can be traded from the web at all (token and vault known). */
  available: boolean;
  /** The router's own preview of the output, in base units of the output token. */
  previewOut: bigint | null;
  previewVenue: "vault" | "rfq" | null;
  previewError: string | null;
  previewing: boolean;
  eligible: boolean | null;
  balance: bigint | null;
  amountIn: bigint | null;
  inDecimals: number;
  outDecimals: number;
  stage: SwapStage;
  txHash: `0x${string}` | null;
  error: string | null;
  execute: () => Promise<void>;
  reset: () => void;
}

/**
 * Everything the swap ticket needs to settle a trade through SwapRouter on Robinhood Chain: a debounced
 * on-chain preview (the bound the trader signs comes from the router, not from the display formula),
 * the TRADER check, the wallet balance, and approve-then-swap through the user's Privy wallet.
 */
export function useOnchainSwap(market: VaultMarket | undefined, buyToken: boolean, amountRaw: string, slippageBps: number): OnchainSwap {
  const { walletAddress, authenticated } = useSession();
  const { wallets } = useWallets();

  const token = market?.tokenAddress;
  const tokenDecimals = market?.tokenDecimals ?? 18;
  const available = Boolean(token && market?.vaultAddress);
  const tokenIn = buyToken ? USDG : token;
  const tokenOut = buyToken ? token : USDG;
  const inDecimals = buyToken ? USDG_DECIMALS : tokenDecimals;
  const outDecimals = buyToken ? tokenDecimals : USDG_DECIMALS;
  const amountIn = useMemo(() => toUnits(amountRaw, inDecimals), [amountRaw, inDecimals]);
  const account = walletAddress as `0x${string}` | null;

  const [previewOut, setPreviewOut] = useState<bigint | null>(null);
  const [previewVenue, setPreviewVenue] = useState<"vault" | "rfq" | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [stage, setStage] = useState<SwapStage>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0); // bump to re-read balances after a swap

  // Router preview, debounced so typing does not fire a call per keystroke.
  useEffect(() => {
    if (!available || !tokenIn || !tokenOut || !amountIn) {
      const t = setTimeout(() => {
        setPreviewOut(null);
        setPreviewVenue(null);
        setPreviewError(null);
      }, 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setPreviewing(true);
      try {
        const [out, venue] = await getReader().readContract({
          address: ROUTER,
          abi: SWAP_ROUTER_ABI,
          functionName: "previewExactIn",
          args: [
            {
              tokenIn,
              tokenOut,
              amountIn,
              minAmountOut: BigInt(0),
              to: zeroAddress,
              deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
              quote: EMPTY_QUOTE,
              quoteSig: "0x",
            },
          ],
        });
        if (cancelled) return;
        setPreviewOut(out);
        setPreviewVenue(venue === 1 ? "rfq" : "vault");
        setPreviewError(null);
      } catch (e) {
        if (cancelled) return;
        setPreviewOut(null);
        setPreviewVenue(null);
        setPreviewError(describeSwapError(e));
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [available, tokenIn, tokenOut, amountIn, nonce]);

  // Eligibility and balance of the input token.
  useEffect(() => {
    if (!authenticated || !account || !tokenIn) {
      const t = setTimeout(() => {
        setEligible(null);
        setBalance(null);
      }, 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    (async () => {
      try {
        const [ok, bal] = await Promise.all([
          getReader().readContract({ address: REGISTRY, abi: ELIGIBILITY_REGISTRY_ABI, functionName: "isEligible", args: [account, TRADER_ROLE] }),
          getReader().readContract({ address: tokenIn, abi: erc20Abi, functionName: "balanceOf", args: [account] }),
        ]);
        if (!cancelled) {
          setEligible(ok);
          setBalance(bal);
        }
      } catch {
        if (!cancelled) {
          setEligible(null);
          setBalance(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, account, tokenIn, nonce]);

  const execute = useCallback(async () => {
    if (!account || !tokenIn || !tokenOut || !amountIn || previewOut === null) return;
    setError(null);
    setTxHash(null);
    try {
      const wallet = wallets.find((w) => w.address.toLowerCase() === account.toLowerCase()) ?? wallets[0];
      if (!wallet) throw new Error("No wallet is connected.");
      await wallet.switchChain(robinhoodChain.id);
      const signer = createWalletClient({
        account: wallet.address as `0x${string}`,
        chain: robinhoodChain,
        transport: custom(await wallet.getEthereumProvider()),
      });
      const publicClient = getReader();

      const allowance = await publicClient.readContract({ address: tokenIn, abi: erc20Abi, functionName: "allowance", args: [account, ROUTER] });
      if (allowance < amountIn) {
        setStage("approving");
        // Approve exactly this trade, never an unlimited allowance.
        const approveHash = await signer.writeContract({ address: tokenIn, abi: erc20Abi, functionName: "approve", args: [ROUTER, amountIn] });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      setStage("swapping");
      const minAmountOut = (previewOut * BigInt(10_000 - slippageBps)) / BigInt(10_000);
      const params = {
        tokenIn,
        tokenOut,
        amountIn,
        minAmountOut,
        to: zeroAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
        quote: EMPTY_QUOTE,
        quoteSig: "0x" as const,
      };
      // Simulate first so a revert shows its reason instead of costing gas.
      const { request } = await publicClient.simulateContract({ account, address: ROUTER, abi: SWAP_ROUTER_ABI, functionName: "swapExactIn", args: [params] });
      const hash = await signer.writeContract(request);
      setTxHash(hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The swap transaction reverted.");
      setStage("done");
      setNonce((n) => n + 1);
    } catch (e) {
      setError(describeSwapError(e));
      setStage("idle");
    }
  }, [account, tokenIn, tokenOut, amountIn, previewOut, slippageBps, wallets]);

  const reset = useCallback(() => {
    setStage("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return {
    available,
    previewOut,
    previewVenue,
    previewError,
    previewing,
    eligible,
    balance,
    amountIn,
    inDecimals,
    outDecimals,
    stage,
    txHash,
    error,
    execute,
    reset,
  };
}
