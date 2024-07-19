#!/bin/bash

# Define the wallet directory
WALLET_DIR="wallet"

# Define the crypto-config directory (adjust this path as necessary)
CRYPTO_CONFIG_DIR="./organizations"

# Function to create directories and copy credentials
create_wallet_entry() {
  local org=$1
  local user=$2

  mkdir -p ${WALLET_DIR}/${org}/${user}/signcerts
  mkdir -p ${WALLET_DIR}/${org}/${user}/keystore

  cp ${CRYPTO_CONFIG_DIR}/peerOrganizations/${org}.example.com/users/${user}@${org}.example.com/msp/signcerts/${user}@${org}.example.com-cert.pem ${WALLET_DIR}/${org}/${user}/signcerts/
  cp ${CRYPTO_CONFIG_DIR}/peerOrganizations/${org}.example.com/users/${user}@${org}.example.com/msp/keystore/* ${WALLET_DIR}/${org}/${user}/keystore/
}

# Copy crypto material from blockchain/test-network
cp -r -p ../blockchain/test-network/organizations/ordererOrganizations ${CRYPTO_CONFIG_DIR}
cp -r -p ../blockchain/test-network/organizations/peerOrganizations ${CRYPTO_CONFIG_DIR}

# Create wallet entries for Org1
create_wallet_entry "org1" "Admin"
create_wallet_entry "org1" "User1"

# Create wallet entries for Org2
create_wallet_entry "org2" "Admin"
create_wallet_entry "org2" "User1"
