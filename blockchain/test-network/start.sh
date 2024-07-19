#!/bin/bash

docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker volume prune -f
docker network prune -f

export COMPOSE_PROJECT_NAME=rx

bash ./network.sh up
bash ./network.sh createChannel -c channel1
bash ./deploy-cc.sh

docker ps -a

# cd addOrg3
# ./addOrg3.sh up -c channel1