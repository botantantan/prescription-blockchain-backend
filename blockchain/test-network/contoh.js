'use strict';

const { Contract } = require('fabric-contract-api');

const { MSP, attributeList, activationStatus, isAttributeValid, normalizeValue } = require('./constant');

const DOC_TYPE = "merchantAttr";
const ATTR_AUTHORITY_DOC_TYPE = "attributeAuthority";

const ATTR_STATUS = {
    PENDING: 'PENDING',
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE'
};

const validateAndGetMerchant = async (ctx, merchantId) => {
    const merchantAsBytes = await ctx.stub.getState(merchantId);
    if (!merchantAsBytes || merchantAsBytes.length === 0) {
        throw new Error(`Merchant with merchantId ${merchantId} does not exist`);
    }

    const merchant = JSON.parse(merchantAsBytes.toString());
    if (merchant.docType !== DOC_TYPE) {
        throw new Error(`Document type is not ${DOC_TYPE}`);
    }

    return merchant;
}

class MerchantAttrAssetTransfer extends Contract {
    async initLedger(ctx) {
        console.info('[INFO] Initialized the ledger for merchant attribute asset transfer');
    }

    _getCommonNameFromId(idString) {
        const match = idString.match(/CN=([^:]+)/);
        return match ? match[1] : null;
    }

    _mspValidation(ctx, mspList) {
        const msp = ctx.clientIdentity.getMSPID();
        const res = mspList.includes(msp);

        if (!res) {
            throw new Error(`Client is not authorized to perform this operation`);
        }

        return res;
    }

    async _validateAuthorityAttribute(ctx, attributeName) {
        const attributeAuthorityId = this._getCommonNameFromId(ctx.clientIdentity.getID());
        const attributeAuthorityAsBytes = await ctx.stub.getState(attributeAuthorityId);
        if (!attributeAuthorityAsBytes || attributeAuthorityAsBytes.length === 0) {
            throw new Error(`Attribute authority with attributeAuthorityId ${attributeAuthorityId} does not exist`);
        }
    
        const attributeAuthority = JSON.parse(attributeAuthorityAsBytes.toString());
        if (attributeAuthority.docType !== ATTR_AUTHORITY_DOC_TYPE) {
            throw new Error(`Document type is not ${ATTR_AUTHORITY_DOC_TYPE}`);
        }
    
        if (!attributeAuthority.attributes.includes(attributeName)) {
            throw new Error(`Attribute ${attributeName} is not authorized for this operation`);
        }
    
        return attributeAuthority;
    }

    async getAttributesList(ctx) {
        return attributeList;
    }

    async createMerchant(ctx, name, merchantId, date) {
        this._mspValidation(ctx, [MSP.MERCHANT]);
        const merchant = {
            docType: DOC_TYPE,
            merchantId,
            name,
            attributes: {},
            createdAt: date,
            updatedAt: date
        };

        await ctx.stub.putState(merchantId, Buffer.from(JSON.stringify(merchant)));

        return merchantId;
    }

    async fetchAllMerchantData(ctx) {
        this._mspValidation(ctx, [MSP.ATTRIBUTE_AUTHORITY]);
        const startKey = 'merchant_';
        const endKey = 'merchant_z';

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const allResults = [];
        let res = await iterator.next();

        while(!res.done) {
            if (res.value) {
                console.info(`found state update with value: ${res.value.value.toString('utf8')}`);
                const obj = JSON.parse(res.value.value.toString('utf8'));

                if (obj.docType !== DOC_TYPE) continue;
                allResults.push(obj);
            }
            res = await iterator.next();
        }

        return allResults;
    }

    async fetchOwnMerchantData(ctx) {
        this._mspValidation(ctx, [MSP.MERCHANT]);
        const merchantId = this._getCommonNameFromId(ctx.clientIdentity.getID());
        const merchant = await validateAndGetMerchant(ctx, merchantId);
        return merchant;
    }

    async fetchMerchantData(ctx, merchantId) {
        this._mspValidation(ctx, [MSP.ATTRIBUTE_AUTHORITY]);
        const merchant = await validateAndGetMerchant(ctx, merchantId);
        return merchant;
    }

    async proposeMerchantAttr(ctx, attributeName, attributeValue, uuid, date) {
        this._mspValidation(ctx, [MSP.MERCHANT]);
        const merchantId = this._getCommonNameFromId(ctx.clientIdentity.getID());
        const merchant = await validateAndGetMerchant(ctx, merchantId);
        attributeValue = normalizeValue(attributeValue, attributeName);

        if (!isAttributeValid(attributeName, attributeValue)) {
            throw new Error(`Attribute ${attributeName} is not valid`);
        }

        const idempotentKey = `attr_${uuid}`;
        const newAttribute = {
            idempotentKey: idempotentKey,
            value: attributeValue,
            status: ATTR_STATUS.PENDING,
            createdAt: date,
            updatedAt: date,
            updatedBy: merchantId,
        };

        merchant.attributes[attributeName] = newAttribute;
        merchant.updatedAt = date;
        merchant.updatedBy = merchantId;

        await ctx.stub.putState(merchantId, Buffer.from(JSON.stringify(merchant)));
    }

    async fetchPendingOwnMerchantAttr(ctx) {
        this._mspValidation(ctx, [MSP.MERCHANT]);
        const merchantId = this._getCommonNameFromId(ctx.clientIdentity.getID());
        const merchant = await validateAndGetMerchant(ctx, merchantId);

        const pendingAttributes = Object.keys(merchant.attributes).filter(attr => merchant.attributes[attr].status === ATTR_STATUS.PENDING);

        const result = {};
        pendingAttributes.forEach(attr => {
            result[attr] = merchant.attributes[attr];
        });

        return result;
    }

    async fetchPendingMerchantAttr(ctx, merchantId) {
        this._mspValidation(ctx, [MSP.ATTRIBUTE_AUTHORITY]);
        const merchant = await validateAndGetMerchant(ctx, merchantId);

        const pendingAttributes = Object.keys(merchant.attributes).filter(attr => merchant.attributes[attr].status === ATTR_STATUS.PENDING);

        const result = {};
        pendingAttributes.forEach(attr => {
            result[attr] = merchant.attributes[attr];
        });

        return result;
    }

    async activateMerchantAttr(ctx, merchantId, attributeName, date) {
        this._mspValidation(ctx, [MSP.ATTRIBUTE_AUTHORITY]);
        await this._validateAuthorityAttribute(ctx, attributeName);
        const merchant = await validateAndGetMerchant(ctx, merchantId);

        if (!merchant.attributes[attributeName]) {
            throw new Error(`Attribute ${attributeName} does not exist`);
        }

        const attributeAuthorityId = this._getCommonNameFromId(ctx.clientIdentity.getID());

        merchant.attributes[attributeName].status = ATTR_STATUS.ACTIVE;
        merchant.attributes[attributeName].updatedAt = date;
        merchant.attributes[attributeName].updatedBy = attributeAuthorityId;
        merchant.updatedAt = date;
        merchant.updatedBy = attributeAuthorityId;

        await ctx.stub.putState(merchantId, Buffer.from(JSON.stringify(merchant)));

        let currentActivationRecord;
        const activationRecordAsBytes = await ctx.stub.getState(attributeAuthorityId);
        if (!activationRecordAsBytes || activationRecordAsBytes.length === 0) {
            currentActivationRecord = {
                docType: ATTR_AUTHORITY_DOC_TYPE,
                attributeAuthorityId: attributeAuthorityId,
                records: []
            };
        } else {
            currentActivationRecord = JSON.parse(activationRecordAsBytes.toString());
        }

        const record = {
            merchantId,
            attributeName,
            date,
            method: activationStatus.ACTIVATE
        }

        currentActivationRecord.records.push(record);
        await ctx.stub.putState(attributeAuthorityId, Buffer.from(JSON.stringify(currentActivationRecord)));
    }

    async deactivateMerchantAttr(ctx, merchantId, attributeName, date) {
        this._mspValidation(ctx, [MSP.ATTRIBUTE_AUTHORITY]);
        await this._validateAuthorityAttribute(ctx, attributeName);
        const merchant = await validateAndGetMerchant(ctx, merchantId);

        if (!merchant.attributes[attributeName]) {
            throw new Error(`Attribute ${attributeName} does not exist`);
        }

        const attributeAuthorityId = this._getCommonNameFromId(ctx.clientIdentity.getID());

        merchant.attributes[attributeName].status = ATTR_STATUS.INACTIVE;
        merchant.attributes[attributeName].updatedAt = date;
        merchant.attributes[attributeName].updatedBy = attributeAuthorityId;
        merchant.updatedAt = date;
        merchant.updatedBy = attributeAuthorityId;

        await ctx.stub.putState(merchantId, Buffer.from(JSON.stringify(merchant)));

        let currentActivationRecord;
        const activationRecordAsBytes = await ctx.stub.getState(attributeAuthorityId);
        if (!activationRecordAsBytes || activationRecordAsBytes.length === 0) {
            currentActivationRecord = {
                docType: ATTR_AUTHORITY_DOC_TYPE,
                attributeAuthorityId: attributeAuthorityId,
                records: []
            };
        } else {
            currentActivationRecord = JSON.parse(activationRecordAsBytes.toString());
        }

        const record = {
            merchantId,
            attributeName,
            date,
            method: activationStatus.DEACTIVATE
        }

        currentActivationRecord.records.push(record);
        await ctx.stub.putState(attributeAuthorityId, Buffer.from(JSON.stringify(currentActivationRecord)));
    }

    async fetchActivationRecord(ctx) {
        this._mspValidation(ctx, [MSP.ATTRIBUTE_AUTHORITY]);
        const attributeAuthorityId = this._getCommonNameFromId(ctx.clientIdentity.getID());
        const activationRecordAsBytes = await ctx.stub.getState(attributeAuthorityId);

        if (!activationRecordAsBytes || activationRecordAsBytes.length === 0) {
            return [];
        }

        const activationRecord = JSON.parse(activationRecordAsBytes.toString());
        return activationRecord.records;
    }

    async fetchPaymentChannels(ctx) {
        this._mspValidation(ctx, [MSP.MERCHANT]);
        const response = await ctx.stub.invokeChaincode('channel-policy-asset-transfer', [Buffer.from('fetchAllPaymentChannelDataByMerchant')]);
        if (response.status !== 200) {
            throw new Error(`Failed to fetch payment channels: ${response.message}`);
        }
        const channels = JSON.parse(response.payload.toString());

        channels.forEach(channel => {
            delete channel.policies;
        });

        return channels;
    }

    async queryOwnHistory(ctx) {
        this._mspValidation(ctx, [MSP.MERCHANT]);
        const uid = this._getCommonNameFromId(ctx.clientIdentity.getID());
        let iterator = await ctx.stub.getHistoryForKey(uid);
        let result = [];
        let res = await iterator.next();
        while (!res.done) {
            if (res.value) {
                console.info(`found state update with value: ${res.value.value.toString('utf8')}`);
                const obj = JSON.parse(res.value.value.toString('utf8'));
                result.push(obj);
            }
            res = await iterator.next();
        }
        await iterator.close();
        return result; 
    }

    async queryHistory(ctx, uid) {
        this._mspValidation(ctx, [MSP.ATTRIBUTE_AUTHORITY]);
        let iterator = await ctx.stub.getHistoryForKey(uid);
        let result = [];
        let res = await iterator.next();
        while (!res.done) {
            if (res.value) {
                console.info(`found state update with value: ${res.value.value.toString('utf8')}`);
                const obj = JSON.parse(res.value.value.toString('utf8'));
                result.push(obj);
            }
            res = await iterator.next();
        }
        await iterator.close();
        return result; 
    }

    async mockGenerateAttributeAuthority(ctx, attributes) {
        this._mspValidation(ctx, [MSP.ATTRIBUTE_AUTHORITY]);
        const uid = this._getCommonNameFromId(ctx.clientIdentity.getID());

        // split attributes by comma
        attributes = attributes.split(',').map(attr => attr.trim());
        const attributeAuthority = {
            docType: ATTR_AUTHORITY_DOC_TYPE,
            attributeAuthorityId: uid,
            records: [],
            attributes // array of string
        };

        await ctx.stub.putState(uid, Buffer.from(JSON.stringify(attributeAuthority)));
    }

    async getAuthorityEligibleAttributes(ctx) {
        this._mspValidation(ctx, [MSP.ATTRIBUTE_AUTHORITY]);
        const uid = this._getCommonNameFromId(ctx.clientIdentity.getID());
        const attributeAuthorityAsBytes = await ctx.stub.getState(uid);
        if (!attributeAuthorityAsBytes || attributeAuthorityAsBytes.length === 0) {
            throw new Error(`Attribute authority with attributeAuthorityId ${uid} does not exist`);
        }

        const attributeAuthority = JSON.parse(attributeAuthorityAsBytes.toString());
        if (attributeAuthority.docType !== ATTR_AUTHORITY_DOC_TYPE) {
            throw new Error(`Document type is not ${ATTR_AUTHORITY_DOC_TYPE}`);
        }

        return attributeAuthority.attributes;
    }

    async getMspId(ctx) {
        return ctx.clientIdentity.getMSPID();
    }
}

module.exports = MerchantAttrAssetTransfer;