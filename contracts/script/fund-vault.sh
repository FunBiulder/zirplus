#!/usr/bin/env bash
# Seeds the NVDA AnchorVault with ~$5 of USDG and ~$5 of NVDA, bought with ETH on Uniswap V3 (Robinhood Chain).
#   cd contracts && source .env && bash script/fund-vault.sh
# Optional: ETH_IN=4200000000000000 (wei, default 0.0042 ETH ≈ $10) and SLIPPAGE_BPS=100 (1%).
# Every step prints what it will do and the on-chain result; any failure stops the script.
set -euo pipefail

R=${ROBINHOOD_RPC:?source .env first}
PK=${PRIVATE_KEY:?source .env first}
ME=$(cast wallet address --private-key "$PK")

# Uniswap V3 on Robinhood Chain (developers.uniswap.org › v3 › Robinhood Chain deployments)
SR=0xcaf681a66d020601342297493863e78c959e5cb2   # SwapRouter02
Q=0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7    # QuoterV2
WETH=0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73
USDG=0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
NVDA=0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC
VAULT=0x049A177583309763350e46B3CB2eAd7508c08D9d

ETH_IN=${ETH_IN:-4200000000000000}
SLIP=${SLIPPAGE_BPS:-100}
QSIG='quoteExactInputSingle((address,address,uint256,uint24,uint160))(uint256,uint160,uint32,uint256)'
SWAP='exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))(uint256)'

first() { awk '{print $1}' | head -1; }
# Big-integer a*b/c (amounts in wei overflow bash's 64-bit arithmetic).
pct() { python -c "import sys; print(int(sys.argv[1]) * int(sys.argv[2]) // int(sys.argv[3]))" "$1" "$2" "$3"; }
bal() { cast call "$1" 'balanceOf(address)(uint256)' "$ME" --rpc-url "$R" | first; }
send() { cast send "$@" --rpc-url "$R" --private-key "$PK" | grep -E '^(status|transactionHash)'; }

echo "Wallet $ME  ETH $(cast balance "$ME" --rpc-url "$R" --ether)"
echo "Market live: $(cast call 0xb9460491694e13Afffdc13Dd578147f3323241d2 'isLive(address)(bool)' $NVDA --rpc-url "$R")"

# 1. ETH -> USDG on the 0.01% WETH/USDG pool (deepest)
q=$(cast call $Q "$QSIG" "($WETH,$USDG,$ETH_IN,100,0)" --rpc-url "$R" | first)
min=$(pct "$q" $(( 10000 - SLIP )) 10000)
echo; echo "1) Swap $(cast from-wei "$ETH_IN") ETH -> ~$(cast format-units "$q" 6) USDG (min $(cast format-units "$min" 6))"
send $SR "$SWAP" "($WETH,$USDG,100,$ME,$ETH_IN,$min,0)" --value "$ETH_IN"
usdg=$(bal $USDG); echo "   USDG balance: $(cast format-units "$usdg" 6)"

# 2. Half the USDG -> NVDA on the 0.05% USDG/NVDA pool (deepest)
half=$(pct "$usdg" 1 2)
q=$(cast call $Q "$QSIG" "($USDG,$NVDA,$half,500,0)" --rpc-url "$R" | first)
min=$(pct "$q" $(( 10000 - SLIP )) 10000)
echo; echo "2) Swap $(cast format-units "$half" 6) USDG -> ~$(cast from-wei "$q") NVDA (min $(cast from-wei "$min"))"
send $USDG 'approve(address,uint256)(bool)' $SR "$half"
send $SR "$SWAP" "($USDG,$NVDA,500,$ME,$half,$min,0)"

# 3. Deposit everything into the vault
usdg=$(bal $USDG); nvda=$(bal $NVDA)
shares=$(cast call $VAULT 'previewDeposit(uint256,uint256)(uint256)' "$usdg" "$nvda" --rpc-url "$R" | first)
minShares=$(pct "$shares" 99 100)
echo; echo "3) Deposit $(cast format-units "$usdg" 6) USDG + $(cast from-wei "$nvda") NVDA -> ~$shares shares"
send $USDG 'approve(address,uint256)(bool)' $VAULT "$usdg"
send $NVDA 'approve(address,uint256)(bool)' $VAULT "$nvda"
send $VAULT 'deposit(uint256,uint256,uint256,address)(uint256)' "$usdg" "$nvda" "$minShares" "$ME"

echo
echo "Vault TVL:        $(cast format-units "$(cast call $VAULT 'totalValue()(uint256)' --rpc-url "$R" | first)" 6) USDG"
echo "Token inventory:  $(cast call $VAULT 'inventoryRatioBps()(uint256)' --rpc-url "$R" | first) bps (5000 = balanced)"
echo "Your shares:      $(bal $VAULT)"
echo "ETH left:         $(cast balance "$ME" --rpc-url "$R" --ether)"
