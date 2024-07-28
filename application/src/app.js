/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const channelName = envOrDefault('CHANNEL_NAME', 'channel1');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'basic');
const mspId = envOrDefault('MSP_ID', 'Org1MSP');

// Path to crypto materials.
const cryptoPath = envOrDefault(
    'CRYPTO_PATH',
    path.resolve(
        __dirname,
        '..',
        '..',
        'blockchain',
        'test-network',
        'organizations',
        'peerOrganizations',
        'org1.example.com'
    )
);

// Path to user private key directory. [priv_sk]
const keyDirectoryPath = envOrDefault(
    'KEY_DIRECTORY_PATH',
    path.resolve(
        cryptoPath,
        'users',
        'User1@org1.example.com',
        'msp',
        'keystore'
    )
);

// Path to user certificate directory. [{user@org}-cert.pem]
const certDirectoryPath = envOrDefault(
    'CERT_DIRECTORY_PATH',
    path.resolve(
        cryptoPath,
        'users',
        'User1@org1.example.com',
        'msp',
        'signcerts'
    )
);

// Path to peer tls certificate. [ca.crt]
const tlsCertPath = envOrDefault(
    'TLS_CERT_PATH',
    path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt')
);

// Gateway peer endpoint.
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:7051');

// Gateway peer SSL host name override.
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.org1.example.com');

const formatTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day},${hours}:${minutes}`;
};

const utf8Decoder = new TextDecoder();
const timestamp = formatTimestamp()
let rxIdCounter = '7'

async function main() {
    displayInputParameters();

    // The gRPC client connection should be shared by all Gateway connections to this endpoint.
    const client = await newGrpcConnection();

    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        // Default timeouts for different gRPC calls
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
        },
    });

    try {
        // Get a network instance representing the channel where the smart contract is deployed.
        const network = gateway.getNetwork(channelName);

        // Get the smart contract from the network.
        const contract = network.getContract(chaincodeName, 'RxContract');

        // // Init ledger with 6 prescription
        // await initLedger(contract)

        // // Get all available assets
        // await getAllAssets(contract)

        // // Create prescription
        // await createRx(contract)

        // // Terminate prescription
        // await terminateRx(contract)
        
        // Fill/Complete prescription
        await fillRx(contract)
    } finally {
        gateway.close();
        client.close();
    }
}

main().catch((error) => {
    console.error('******** FAILED to run the application:', error);
    process.exitCode = 1;
});

// Estrablish gRPC connection to the Gateway
async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity() {
    const certPath = await getFirstDirFileName(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

async function getFirstDirFileName(dirPath) {
    const files = await fs.readdir(dirPath);
    const file = files[0];
    if (!file) {
        throw new Error(`No files in directory: ${dirPath}`);
    }
    return path.join(dirPath, file);
}

async function newSigner() {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

// Invoking chaincode
async function initLedger(contract) {
    console.log('\n--> Submit Transaction: initLedger')

    try {
        await contract.submitTransaction('initLedger');
        
        console.log('*** Transaction committed successfully');
    } catch (error) {
        console.log('*** Caught an error, \n', error)
    }
}

async function getAllAssets(contract) {
    console.log('\n--> Evaluate Transaction: getAllAssets')

    try {
        const resultBytes = await contract.evaluateTransaction('getAllAssets');

        const resultJson = utf8Decoder.decode(resultBytes);
        const result = JSON.parse(resultJson);
        console.log('*** Result:', result);
    } catch (error) {
        console.log('*** Caught an error, \n', error)
    }
}

// prescriptionId, createdAt, prescribedFor, prescribedBy, medicineId, isIter, itercount
async function createRx(contract) {
    console.log('\n--> Submit Transaction, createRx')

    try {
        await contract.submitTransaction(
            'createRx',
            rxIdCounter,
            timestamp,
            '1020',
            '2006',
            '15',
            '1',
            '4'
        )
        
        rxIdCounter = (Number(rxIdCounter) + 1).toString()
        console.log('*** Transaction committed successfully')
    } catch (error) {
        console.log('*** Caught an error, \n', error)
    }
}

// prescriptionId, terminatedAt, doctorId
async function terminateRx(contract) {
    console.log('\n--> Submit Transaction, terminateRx')

    try {
        await contract.submitTransaction(
            'terminateRx',
            '5',
            timestamp,
            '2030'
        )

        rxIdCounter = (Number(rxIdCounter) + 1).toString()
        console.log('*** Transaction committed successfully')
    } catch (error) {
        console.log('*** Caught an error, \n', error)
    }
}

// prescriptionId, filledAt, pharmacistId
async function fillRx(contract) {
    console.log('\n--> Submit Transaction, fillRx')

    try {
        await contract.submitTransaction(
            'fillRx',
            '4',
            timestamp,
            '3001'
        )

        rxIdCounter = (Number(rxIdCounter) + 1).toString()
        console.log('*** Transaction committed successfully')
    } catch (error) {
        console.log('*** Caught an error \n', error)
    }
}

// /**
//  * Submit transaction asynchronously, allowing the application to process the smart contract response (e.g. update a UI)
//  * while waiting for the commit notification.
//  */
// async function transferAssetAsync(contract) {
//     console.log(
//         '\n--> Async Submit Transaction: TransferAsset, updates existing asset owner'
//     );

//     const commit = await contract.submitAsync('TransferAsset', {
//         arguments: [assetId, 'Saptha'],
//     });
//     const oldOwner = utf8Decoder.decode(commit.getResult());

//     console.log(
//         `*** Successfully submitted transaction to transfer ownership from ${oldOwner} to Saptha`
//     );
//     console.log('*** Waiting for transaction commit');

//     const status = await commit.getStatus();
//     if (!status.successful) {
//         throw new Error(
//             `Transaction ${
//                 status.transactionId
//             } failed to commit with status code ${String(status.code)}`
//         );
//     }

//     console.log('*** Transaction committed successfully');
// }

// async function readAssetByID(contract) {
//     console.log(
//         '\n--> Evaluate Transaction: ReadAsset, function returns asset attributes'
//     );

//     const resultBytes = await contract.evaluateTransaction(
//         'ReadAsset',
//         assetId
//     );

//     const resultJson = utf8Decoder.decode(resultBytes);
//     const result = JSON.parse(resultJson);
//     console.log('*** Result:', result);
// }

// /**
//  * submitTransaction() will throw an error containing details of any error responses from the smart contract.
//  */
// async function updateNonExistentAsset(contract) {
//     console.log(
//         '\n--> Submit Transaction: UpdateAsset asset70, asset70 does not exist and should return an error'
//     );

//     try {
//         await contract.submitTransaction(
//             'UpdateAsset',
//             'asset70',
//             'blue',
//             '5',
//             'Tomoko',
//             '300'
//         );
//         console.log('******** FAILED to return an error');
//     } catch (error) {
//         console.log('*** Successfully caught the error: \n', error);
//     }
// }

/**
 * envOrDefault() will return the value of an environment variable, or a default value if the variable is undefined.
 */
function envOrDefault(key, defaultValue) {
    return process.env[key] || defaultValue;
}

/**
 * displayInputParameters() will print the global scope parameters used by the main driver routine.
 */
function displayInputParameters() {
    console.log(`channelName:       ${channelName}`);
    console.log(`chaincodeName:     ${chaincodeName}`);
    console.log(`mspId:             ${mspId}`);
    console.log(`cryptoPath:        ${cryptoPath}`);
    console.log(`keyDirectoryPath:  ${keyDirectoryPath}`);
    console.log(`certDirectoryPath: ${certDirectoryPath}`);
    console.log(`tlsCertPath:       ${tlsCertPath}`);
    console.log(`peerEndpoint:      ${peerEndpoint}`);
    console.log(`peerHostAlias:     ${peerHostAlias}`);
}
