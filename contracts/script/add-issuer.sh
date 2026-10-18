#!/usr/bin/env bash
# Whitelists a dedicated attestation issuer (the hot key the website's /api/platform/attest route signs with).
# setAttestationIssuer is timelocked, so this is two steps 48 hours apart:
#   cd contracts && source .env
#   bash script/add-issuer.sh schedule 0xISSUER      # queues it now
#   bash script/add-issuer.sh status   0xISSUER      # shows when it can run
#   bash script/add-issuer.sh execute  0xISSUER      # after the delay: makes it live
# Make a fresh issuer key with `cast wallet new`, put its private key in the web host's ATTESTER_PRIVATE_KEY,
# and send it a little ETH for gas. Never reuse the deployer key: it owns governance.
set -euo pipefail

MODE=${1:?schedule | status | execute}
ISSUER=${2:?issuer address}
R=${ROBINHOOD_RPC:?source .env first}
PC=0xf7D02fd1Bc8C40fd20aed40FCeD073e408144701

CALL=$(cast calldata 'setAttestationIssuer(address,bool)' "$ISSUER" true)
SALT=$(cast keccak "zirplus.add-issuer.$(cast to-check-sum-address "$ISSUER")")
RATIONALE=$(cast format-bytes32-string "add self-cert issuer")
ID=$(cast call $PC 'operationId(bytes[],bytes32)(bytes32)' "[$CALL]" "$SALT" --rpc-url "$R")

case "$MODE" in
  schedule)
    cast send $PC 'schedule(bytes[],bytes32,bytes32)(bytes32)' "[$CALL]" "$SALT" "$RATIONALE" \
      --rpc-url "$R" --private-key "${PRIVATE_KEY:?}" | grep -E '^(status|transactionHash)'
    echo "Scheduled operation $ID. Execute after the timelock: bash script/add-issuer.sh execute $ISSUER"
    ;;
  status)
    echo "operation $ID"
    OP=$(cast call $PC 'operations(bytes32)(uint64,bool,bool,bytes32)' "$ID" --rpc-url "$R")
    echo "runnable after (unix): $(echo "$OP" | sed -n 1p | awk '{print $1}')   now: $(date +%s)"
    echo "executed: $(echo "$OP" | sed -n 2p)   cancelled: $(echo "$OP" | sed -n 3p)"
    echo "issuer whitelisted: $(cast call $PC 'attestationIssuer(address)(bool)' "$ISSUER" --rpc-url "$R")"
    ;;
  execute)
    cast send $PC 'execute(bytes[],bytes32)' "[$CALL]" "$SALT" --rpc-url "$R" --private-key "${PRIVATE_KEY:?}" | grep -E '^(status|transactionHash)'
    echo "issuer whitelisted: $(cast call $PC 'attestationIssuer(address)(bool)' "$ISSUER" --rpc-url "$R")"
    ;;
  *) echo "unknown mode $MODE"; exit 1 ;;
esac
