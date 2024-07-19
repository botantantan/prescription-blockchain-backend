#!/bin/bash

bash ./createWallet.sh
docker-compose down -v
docker-compose up -d