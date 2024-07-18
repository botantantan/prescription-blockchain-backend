#!/bin/bash
. scripts/utils.sh
. scripts/envVar.sh

export FABRIC_CFG_PATH=$PWD/../config/
export VERBOSE=false

CHANNEL_NAME=channel1
CC_NAME=basic
ORG=$1
BLOCK_NUMBER=$2
BLOCK_NAME=$3
JSON_NAME=$4


setGlobals $ORG
set -x

peer channel fetch $BLOCK_NUMBER ./tx-block/$BLOCK_NAME -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c $CHANNEL_NAME --tls --cafile $ORDERER_CA
configtxlator proto_decode --input ./tx-block/$BLOCK_NAME --type=common.Block --output ./tx-block/$JSON_NAME

{ set +x; } 2> /dev/null
cat log.txt