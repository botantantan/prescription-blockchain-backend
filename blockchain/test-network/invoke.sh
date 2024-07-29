#!/bin/bash
. scripts/utils.sh
. scripts/envVar.sh

export FABRIC_CFG_PATH=$PWD/../config/
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

# getAsset
# prescriptionId
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
  -C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
  -c '{"function":"getAsset","Args":["7"]}' \
  >&log.txt

# getAssetObject
# prescriptionId
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
  -C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
  -c '{"function":"getAssetObject","Args":["1"]}' \
  >&log.txt

# getAllAssets
peer chaincode query -C channel1 -n basic -c '{"Args":["getAllAssets"]}' \
  >&log.txt

# createRx
# prescriptionId, createdAt, prescribedFor, prescribedBy, medicineId, isIter, iterCount
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
  -C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
  -c '{"function":"createRx","Args":["7", "2024-7-20", "1020", "2006", "15", "1", "4"]}' \
  >&log.txt

# terminateRx
# prescriptionId, terminatedAt, doctorId
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
  -C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
  -c '{"function":"terminateRx","Args":["5", "2024-7-21", "2030"]}' \
  >&log.txt

# fillRx
# prescriptionId, filledAt, pharmacistId

# prescription without iter [1] -> complete (4)
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
  -C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
  -c '{"function":"fillRx","Args":["1", "2024-7-21", "3001"]}' \
  >&log.txt

# prescription with iter [4] -> fill (3)
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA \
  -C $CHANNEL_NAME -n ${CC_NAME} $PEER_CONN_PARMS \
  -c '{"function":"fillRx","Args":["4", "2024-7-21", "3002"]}' \
  >&log.txt

{ set +x; } 2>/dev/null
cat log.txt
