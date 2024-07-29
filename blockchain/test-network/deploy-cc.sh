#!/bin/bash

bash ./network.sh deployCC -c channel1 -ccn basic -ccp ../../chaincode -ccl javascript -ccep "AND('Org1MSP.member','Org2MSP.member')"
