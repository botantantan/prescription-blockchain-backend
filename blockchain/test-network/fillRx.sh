#!/bin/bash
. scripts/utils.sh
. scripts/envVar.sh

export FABRIC_CFG_PATH=$PWD/../config/
export VERBOSE=false

CHANNEL_NAME=channel1
CC_NAME=basic

parsePeerConnectionParameters $@
set -x

# fillRx
# prescriptionId, filledAt, pharmacistId

# prescription without iter [1] -> complete (4)
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
-C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
-c '{"function":"fillRx","Args":["1", "2024-7-21", "3001"]}' \
>&log.txt

# prescription with iter [4] -> fill (3)
# peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
# -C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
# -c '{"function":"fillRx","Args":["4", "2024-7-21", "3002"]}' \
# >&log.txt

{ set +x; } 2>/dev/null
cat log.txt