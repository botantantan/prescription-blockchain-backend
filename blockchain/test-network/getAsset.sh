#!/bin/bash
. scripts/utils.sh
. scripts/envVar.sh

export FABRIC_CFG_PATH=$PWD/../config/
export VERBOSE=false

CHANNEL_NAME=channel1
CC_NAME=basic

parsePeerConnectionParameters $@
set -x

# getAsset
# prescriptionId
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
-C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
-c '{"function":"getAsset","Args":["1"]}' \
>&log.txt

{ set +x; } 2>/dev/null
cat log.txt