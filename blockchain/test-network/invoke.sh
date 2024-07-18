#!/bin/bash
. scripts/utils.sh
. scripts/envVar.sh

export FABRIC_CFG_PATH=$PWD/../../config/
export VERBOSE=false

CHANNEL_NAME=channel1
CC_NAME=basic

parsePeerConnectionParameters $@
set -x

# initLedger
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
-C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
-c '{"function":"initLedger","Args":[]}' \
>&log.txt

# createRx
# prescriptionId, createdAt, prescribedFor, prescribedBy, medicineId, isIter, iterCount
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
-C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
-c '{"function":"createRx","Args":["10", "2024-7-20", "1006", "2006", ["5", "6"], "true", "3"]}' \
>&log.txt

# getRx
# prescriptionId
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
-C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
-c '{"function":"getRx","Args":["1"]}' \
>&log.txt

# getActivity
# activityId
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
-C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
-c '{"function":"getActivity","Args":["1"]}' \
>&log.txt

# terminateRx
# prescriptionId, terminatedAt, doctorId
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
-C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
-c '{"function":"terminateRx","Args":["6", "2024-7-21", "2006"]}' \
>&log.txt

# fillRx
# prescriptionId, filledAt, pharmacistId
# prescription without iter
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
-C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
-c '{"function":"fillRx","Args":["4", "2024-7-21", "3001"]}' \
>&log.txt

# prescription with iter
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
-C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
-c '{"function":"fillRx","Args":["2", "2024-7-21", "3002"]}' \
>&log.txt

{ set +x; } 2>/dev/null
cat log.txt