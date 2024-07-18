#!/bin/bash
. scripts/utils.sh
. scripts/envVar.sh

export FABRIC_CFG_PATH=$PWD/../config/
export VERBOSE=false

CHANNEL_NAME=channel1
CC_NAME=basic

parsePeerConnectionParameters $@
set -x

# terminateRx
# prescriptionId, terminatedAt, doctorId
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
-C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
-c '{"function":"terminateRx","Args":["5", "2024-7-21", "2030"]}' \
>&log.txt

{ set +x; } 2>/dev/null
cat log.txt