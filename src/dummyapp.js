const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connect, signers, identities } = require('@hyperledger/fabric-gateway');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const ccpPath = path.resolve(__dirname, 'connection-org1.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

const getCredentials = () => {
    const certPath = path.resolve(__dirname, 'crypto', 'users', 'User1@org1.example.com', 'msp', 'signcerts', 'cert.pem');
    const keyPath = path.resolve(__dirname, 'crypto', 'users', 'User1@org1.example.com', 'msp', 'keystore', 'priv_sk');
    const tlsCertPath = path.resolve(__dirname, 'crypto', 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');

    return {
        cert: fs.readFileSync(certPath).toString(),
        key: fs.readFileSync(keyPath).toString(),
        tlsCert: fs.readFileSync(tlsCertPath).toString()
    };
};

const getIdentity = (credentials) => {
    return identities.X509Identity.create('Org1MSP', credentials.cert, credentials.key);
};

const getSigner = (credentials) => {
    return signers.newPrivateKeySigner(signers.newPrivateKey(credentials.key));
};

const connectToGateway = async () => {
    const credentials = getCredentials();
    const identity = getIdentity(credentials);
    const signer = getSigner(credentials);

    const gateway = connect({
        client: ccp,
        identity,
        signer,
        tlsRootCertificates: credentials.tlsCert,
        discovery: { enabled: true, asLocalhost: true }
    });

    const network = gateway.getNetwork('mychannel');
    const contract = network.getContract('rx-contract');

    return { gateway, contract };
};

// Endpoint to initialize the ledger
app.post('/api/initLedger', async (req, res) => {
    try {
        const { gateway, contract } = await connectToGateway();
        await contract.submitTransaction('initLedger');
        await gateway.close();
        res.send('Ledger initialized successfully');
    } catch (error) {
        console.error(`Failed to initialize ledger: ${error}`);
        res.status(500).send(error.toString());
    }
});

// Endpoint to get all assets
app.get('/api/getAllAssets', async (req, res) => {
    try {
        const { gateway, contract } = await connectToGateway();
        const result = await contract.evaluateTransaction('getAllAssets');
        await gateway.close();
        res.json(JSON.parse(result.toString()));
    } catch (error) {
        console.error(`Failed to get all assets: ${error}`);
        res.status(500).send(error.toString());
    }
});

// Endpoint to create a new prescription
app.post('/api/createRx', async (req, res) => {
    const { prescriptionId, createdAt, prescribedFor, prescribedBy, medicineId, isIter, iterCount } = req.body;
    try {
        const { gateway, contract } = await connectToGateway();
        await contract.submitTransaction('createRx', prescriptionId, createdAt, prescribedFor, prescribedBy, medicineId, isIter, iterCount);
        await gateway.close();
        res.send('Prescription created successfully');
    } catch (error) {
        console.error(`Failed to create prescription: ${error}`);
        res.status(500).send(error.toString());
    }
});

// Endpoint to terminate a prescription
app.post('/api/terminateRx', async (req, res) => {
    const { prescriptionId, terminatedAt, doctorId } = req.body;
    try {
        const { gateway, contract } = await connectToGateway();
        await contract.submitTransaction('terminateRx', prescriptionId, terminatedAt, doctorId);
        await gateway.close();
        res.send('Prescription terminated successfully');
    } catch (error) {
        console.error(`Failed to terminate prescription: ${error}`);
        res.status(500).send(error.toString());
    }
});

// Endpoint to fill a prescription
app.post('/api/fillRx', async (req, res) => {
    const { prescriptionId, filledAt, pharmacistId } = req.body;
    try {
        const { gateway, contract } = await connectToGateway();
        await contract.submitTransaction('fillRx', prescriptionId, filledAt, pharmacistId);
        await gateway.close();
        res.send('Prescription filled successfully');
    } catch (error) {
        console.error(`Failed to fill prescription: ${error}`);
        res.status(500).send(error.toString());
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
