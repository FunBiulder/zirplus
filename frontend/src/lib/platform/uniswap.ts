import type { PublicClient } from "viem";

/**
 * Uniswap V3 on Robinhood Chain (developers.uniswap.org › v3 › Robinhood Chain deployments). Verified on-chain:
 * SwapRouter02.factory() is the factory every USDG/NVDA pool reports, and its WETH9 is Robinhood's WETH.
 * Uniswap pools trade around the clock and need no Zirplus attestation, so the ticket routes there while the
 * US market is closed (when the vaults quote at the ×3 closed-session spread).
 */
export const UNISWAP = {
  swapRouter02: "0xcaf681a66d020601342297493863e78c959e5cb2",
  quoterV2: "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7",
  feeTiers: [100, 500, 3000, 10000] as const,
} as const;

const QUOTER_ABI = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

export const SWAP_ROUTER02_ABI = [
  {
    type: "function",
    name: "exactInputSingle",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

export interface UniswapQuote {
  amountOut: bigint;
  fee: (typeof UNISWAP.feeTiers)[number];
}

/** Quotes every fee tier through QuoterV2 (simulated, nothing is sent) and returns the best one, or null. */
export async function quoteUniswap(
  client: PublicClient,
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint
): Promise<UniswapQuote | null> {
  const results = await Promise.all(
    UNISWAP.feeTiers.map(async (fee) => {
      try {
        const { result } = await client.simulateContract({
          address: UNISWAP.quoterV2,
          abi: QUOTER_ABI,
          functionName: "quoteExactInputSingle",
          args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: BigInt(0) }],
        });
        return { amountOut: result[0], fee };
      } catch {
        return null; // no pool at this tier, or not enough liquidity for this size
      }
    })
  );
  return results.reduce<UniswapQuote | null>((best, r) => (r && (!best || r.amountOut > best.amountOut) ? r : best), null);
}
