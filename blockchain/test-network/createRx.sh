#!/bin/bash
. scripts/utils.sh
. scripts/envVar.sh

export FABRIC_CFG_PATH=$PWD/../config/
export VERBOSE=false

CHANNEL_NAME=channel1
CC_NAME=basic

parsePeerConnectionParameters $@
set -x

# createRx
# prescriptionId, createdAt, prescribedFor, prescribedBy, medicineId, isIter, iterCount
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
-C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
-c '{"function":"createRx","Args":["7", "2024-7-20", "1020", "2006", "15", "1", "4"]}' \
>&log.txt

{ set +x; } 2>/dev/null
cat log.txt