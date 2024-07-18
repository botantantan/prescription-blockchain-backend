#!/bin/bash
. scripts/utils.sh
. scripts/envVar.sh

export FABRIC_CFG_PATH=$PWD/../config/
export VERBOSE=false

CHANNEL_NAME=channel1
CC_NAME=basic

parsePeerConnectionParameters $@
set -x

# getAllAssets
peer chaincode query -C channel1 -n basic -c '{"Args":["getAllAssets"]}' \
>&log.txt

{ set +x; } 2>/dev/null
cat log.txt