#!/usr/bin/env bash
# Verifies the Robinhood Chain mainnet deployment (deployments/4663.json) on Blockscout.
# Rerunnable: contracts that are already verified are skipped by Blockscout.
#   cd contracts && source .env && bash script/verify.sh
# If Blockscout answers with a Cloudflare "Just a moment..." page (HTTP 403), run this from another network
# (VPN off), or upload deployments/verify/<Contract>.json via the explorer's "Verify & Publish" form instead.
set -euo pipefail

: "${ROBINHOOD_BLOCKSCOUT_API:=https://robinhoodchain.blockscout.com/api/}"
J=deployments/4663.json
addr() { python -c "import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]])" "$J" "$1"; }

PC=$(addr ParamController); ER=$(addr EligibilityRegistry); OR=$(addr OracleRouter); FC=$(addr FeeCollector)
VF=$(addr VaultFactory); RQ=$(addr RfqSettlement); USDG=$(addr USDG); TOKEN=$(addr StockToken)
DEPLOYER=0xcFAb72c3f312e026BBa25cD7D07f01C9257FEBb1

verify() { # name path constructor-args
  echo "== $1"
  forge verify-contract "$(addr "$1")" "$2:$1" --chain 4663 --verifier blockscout \
    --verifier-url "$ROBINHOOD_BLOCKSCOUT_API" --constructor-args "$3" --watch || echo "!! $1 failed"
}

verify ParamController src/ParamController.sol "$(cast abi-encode 'c(address,address,uint256)' $DEPLOYER $DEPLOYER 172800)"
verify EligibilityRegistry src/EligibilityRegistry.sol "$(cast abi-encode 'c(address)' $PC)"
verify NativeAttestationAdapter src/adapters/NativeAttestationAdapter.sol "$(cast abi-encode 'c(address)' $PC)"
verify OracleRouter src/OracleRouter.sol "$(cast abi-encode 'c(address)' $PC)"
verify FeeCollector src/FeeCollector.sol "$(cast abi-encode 'c(address)' $PC)"
verify VaultFactory src/VaultFactory.sol "$(cast abi-encode 'c(address,address,address,address,address)' $PC $ER $OR $FC $USDG)"
verify RfqSettlement src/RfqSettlement.sol "$(cast abi-encode 'c(address,address,address,address,address)' $PC $ER $OR $VF $FC)"
verify SwapRouter src/SwapRouter.sol "$(cast abi-encode 'c(address,address,address,address)' $PC $ER $VF $RQ)"
verify AnchorVault src/AnchorVault.sol "$(cast abi-encode 'c(address,address,address,address,address,address,string,string)' \
  $PC $ER $OR $FC $USDG $TOKEN 'Zirplus NVDA Vault' 'zvNVDA')"
