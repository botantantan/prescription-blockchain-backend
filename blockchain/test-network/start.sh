#!/bin/bash

docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker volume prune -f
docker network prune -f

export COMPOSE_PROJECT_NAME=rx

./network.sh up
./network.sh createChannel -c channel1
# cd addOrg3
# ./addOrg3.sh up -c channel1