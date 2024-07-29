'use strict'

const express = require('express')
const cors = require('cors')
const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

const channelName = envOrDefault('CHANNEL_NAME', 'channel1');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'basic');
const mspId = envOrDefault('MSP_ID', 'Org1MSP');

const cryptoPath = envOrDefault('CRYPTO_PATH', path.resolve(__dirname, '..', 'blockchain', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com'));
const keyDirectoryPath = envOrDefault('KEY_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore'));
const certDirectoryPath = envOrDefault('CERT_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts'));
const tlsCertPath = envOrDefault('TLS_CERT_PATH', path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt'));
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:7051');
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.org1.example.com');

const utf8Decoder = new TextDecoder();

// get file name
async function getFirstDirFileName(dirPath) {
    const files = await fs.readdir(dirPath);
    const file = files[0];
    if (!file) {
        throw new Error(`No files in directory: ${dirPath}`);
    }
    return path.join(dirPath, file);
}

function envOrDefault(key, defaultValue) {
    return process.env[key] || defaultValue;
}

// create new grpc connection
async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

// create new client identity
async function newIdentity() {
    const certPath = await getFirstDirFileName(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

// create new signing implementation
async function newSigner() {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

async function connectToGateway() {
    const client = await newGrpcConnection()
    const identity = await newIdentity()
    const signer = await newSigner()

    const gateway = connect({
        client,
        identity,
        signer,
        evaluateOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        endorseOptions: () => {
            return { deadline: Date.now() + 15000 }; // 15 seconds
        },
        submitOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        commitStatusOptions: () => {
            return { deadline: Date.now() + 60000 }; // 1 minute
        }
    })

    const network = gateway.getNetwork(channelName)
    const contract = network.getContract(chaincodeName, 'RxContract')

    return { gateway, contract}
}

// Endpoint
app.post('/api/initLedger', async (req, res) => {
    try {
        const { gateway, contract } = await connectToGateway()
        await contract.submitTransaction('initLedger')
        gateway.close()
        res.send('Ledger initialized sucessfully')
    } catch (error) {
        console.error(`Failed to initializer ledger: ${error}`)
        res.status(500).send(error.toString())
    }
})

app.get('/api/getAllAssets', async (req, res) => {
    try {
        const { gateway, contract } = await connectToGateway();
        const resultBytes = await contract.evaluateTransaction('getAllAssets');
        const resultJson = utf8Decoder.decode(resultBytes)
        const result = JSON.parse(resultJson)
        gateway.close();
        res.json(result);
    } catch (error) {
        console.error(`Failed to get all assets: ${error}`);
        res.status(500).send(error.toString());
    }
});

app.post('/api/createRx', async (req, res) => {
    const { prescriptionId, creationDate, patientId, doctorId, medicineId, isIter, iterCount } = req.body;
    try {
        const { gateway, contract } = await connectToGateway();
        await contract.submitTransaction('createRx', prescriptionId, creationDate, patientId, doctorId, medicineId, isIter, iterCount);
        gateway.close();
        res.send('Prescription created successfully');
    } catch (error) {
        console.error(`Failed to create prescription: ${error}`);
        res.status(500).send(error.toString());
    }
});

app.post('/api/terminateRx', async (req, res) => {
    const { prescriptionId, terminationDate, doctorId } = req.body;
    try {
        const { gateway, contract } = await connectToGateway();
        await contract.submitTransaction('terminateRx', prescriptionId, terminationDate, doctorId);
        gateway.close();
        res.send('Prescription terminated successfully');
    } catch (error) {
        console.error(`Failed to terminate prescription: ${error}`);
        res.status(500).send(error.toString());
    }
});

app.post('/api/fillRx', async (req, res) => {
    const { prescriptionId, filledDate, pharmacistId } = req.body;
    try {
        const { gateway, contract } = await connectToGateway();
        await contract.submitTransaction('fillRx', prescriptionId, filledDate, pharmacistId);
        gateway.close();
        res.send('Prescription filled successfully');
    } catch (error) {
        console.error(`Failed to fill prescription: ${error}`);
        res.status(500).send(error.toString());
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});