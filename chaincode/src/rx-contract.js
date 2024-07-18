'use strict'

const { Contract } = require('fabric-contract-api')
const { Prescription, Activity, syntaxHighlight } = require('./util/util')

const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');

class RxContract extends Contract {
  constructor() {
    super("RxContract")
    this.activityIdCounter = "1000"
  }

  async initLedger(ctx) {    
    const prescriptions = [
      new Prescription("1", "2024-07-18", "1001", "2001", "1", "0", "0"),
      new Prescription("2", "2024-07-18", "1002", "2002", "2", "0", "0"),
      new Prescription("3", "2024-07-18", "1003", "2003", "3", "0", "0"),
      new Prescription("4", "2024-07-18", "1004", "2004", "4", "1", "5"),
      new Prescription("5", "2024-07-18", "1001", "2002", "5", "1", "3"),
      new Prescription("6", "2024-07-18", "1006", "2006", "6", "1", "2")
    ]

    for (const prescription of prescriptions) {
      await this.createRx(
        ctx,
        prescription.prescriptionId,
        prescription.createdAt,
        prescription.prescribedFor,
        prescription.prescribedBy,
        prescription.medicineId,
        prescription.isIter,
        prescription.iterCount)
    }
  }

  async getAssetObject(ctx, assetId) {
    const assetJSON = await ctx.stub.getState(assetId)
    if (!assetJSON || assetJSON.length === 0) {
        throw new Error(`Asset ${assetId} does not exist`)
    }
    
    return JSON.parse(assetJSON.toString()) // object
  }

  // getAsset returns the asset stored in the world state with given id.
  async getAsset(ctx, assetId) {
    const assetJSON = await ctx.stub.getState(assetId) // get the asset from chaincode state
    if (!assetJSON || assetJSON.length === 0) {
        throw new Error(`The asset ${assetId} does not exist`)
    }
    console.log(assetJSON)
    const strValue = JSON.parse(assetJSON.toString('utf8'))
    console.log(strValue)

    // return JSON.stringify(strValue, null, 2)
    return strValue
  }

  async getAllAssets(ctx) {
    const allResults = []
    // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange('', '')
    let result = await iterator.next()
    while (!result.done) {
        const strValue = Buffer.from(result.value.value.toString()).toString('utf8')
        let record
        try {
            record = JSON.parse(strValue)
        } catch (err) {
            console.log(err)
            record = strValue
        }
        allResults.push(record)
        result = await iterator.next()
    }

    return JSON.stringify(allResults, null, 2)
  }

  // AssetExists returns true when asset with given ID exists in world state.
  async assetExist(ctx, assetId) {
    const assetJSON = await ctx.stub.getState(assetId)
    return assetJSON && assetJSON.length > 0
  }

  async createActivity(ctx, doneAt, prescriptionId, doerId, type) {
    const activity = new Activity(this.activityIdCounter, doneAt, prescriptionId, doerId, type)
    this.activityIdCounter = (Number(this.activityIdCounter) + 1).toString()

    return activity
  }

  async createRx(ctx, prescriptionId, createdAt, prescribedFor, prescribedBy, medicineId, isIter, iterCount) {
    const exists = await this.assetExist(ctx, prescriptionId)
    if (exists) {
      throw new Error(`The asset ${prescriptionId} already exist`)
    }

    const prescription = new Prescription(prescriptionId, createdAt, prescribedFor, prescribedBy, medicineId, isIter, iterCount)
    await ctx.stub.putState(prescriptionId, Buffer.from(JSON.stringify(prescription)))

    const activity = await this.createActivity(ctx, createdAt, prescriptionId, prescribedBy, "1")
    await ctx.stub.putState(activity.activityId, Buffer.from(JSON.stringify(activity)))

    return prescription
  }

  async terminateRx(ctx, prescriptionId, terminatedAt, doctorId) {
    const exists = await this.assetExist(ctx, prescriptionId)
    if (!exists) {
      throw new Error(`The asset ${prescriptionId} don't exist`)
    }

    const prescription = await this.getAssetObject(ctx, prescriptionId)

    if (Boolean(Number(prescription.isValid))) {
      prescription.isValid = "0"
      prescription.terminatedAt = terminatedAt
      await ctx.stub.putState(prescriptionId, Buffer.from(JSON.stringify(prescription)))
      
      const activity = await this.createActivity(ctx, terminatedAt, prescriptionId, doctorId, "2")
      await ctx.stub.putState(activity.activityId, Buffer.from(JSON.stringify(activity)))
    } else {
      throw new Error(`The asset ${prescriptionId} is already terminated`)
    }
  }

  async fillRx(ctx, prescriptionId, filledAt, pharmacistId) {
    const exists = await this.assetExist(ctx, prescriptionId)
    if (!exists) {
      throw new Error(`The asset ${prescriptionId} don't exist`)
    }
    
    const prescription = await this.getAssetObject(ctx, prescriptionId)

    if (Boolean(Number(prescription.isValid))) {
      if (Boolean(Number(prescription.isIter))) {
        if (Number(prescription.iterCount) > 1) {
          prescription.iterCount = (Number(prescription.iterCount) - 1).toString()
          prescription.filledBy = pharmacistId
          await ctx.stub.putState(prescriptionId, Buffer.from(JSON.stringify(prescription)))
  
          const activity = await this.createActivity(ctx, filledAt, prescriptionId, pharmacistId, "3")
          await ctx.stub.putState(activity.activityId, Buffer.from(JSON.stringify(activity)))
        } else if (Number(prescription.iterCount) === 1) {
          prescription.isIter = "0"
          prescription.iterCount = "0"
          
          await this.completeRx(ctx, prescription, filledAt, pharmacistId)
        }
      } else {
        await this.completeRx(ctx, prescription, filledAt, pharmacistId)
      }
    } else {
      throw new Error(`The asset ${prescriptionId} is already terminated`)
    }
  }

  async completeRx(ctx, prescription, filledAt, pharmacistId) {
    prescription.isValid = "0"
    prescription.terminatedAt = filledAt
    prescription.filledBy = pharmacistId
    await ctx.stub.putState(prescription.prescriptionId, Buffer.from(JSON.stringify(prescription)))

    const activity = await this.createActivity(ctx, prescription.filledAt, prescription.prescriptionId, pharmacistId, "4")
    await ctx.stub.putState(activity.activityId, Buffer.from(JSON.stringify(activity)))
  }

  // async createActivityHistory(ctx, prescriptionId) {
  //     const activities = await this.getActivitiesByPrescription(ctx, prescriptionId)
  //     return activities.sort((a, b) => new Date(a.doneAt).getTime() - new Date(b.doneAt).getTime())
  // }

  // async getActivityHistory(ctx, prescriptionId) {
  //     return await this.createActivityHistory(ctx, prescriptionId)
  // }

  // async getActivitiesByPrescription(ctx, prescriptionId) {
  //     const queryString = JSON.stringify({
  //         selector: {
  //             prescriptionId
  //         }
  //     })

  //     const resultsIterator = await ctx.stub.getQueryResult(queryString)
  //     const results = []

  //     while (true) {
  //         const res = await resultsIterator.next()

  //         if (res.value && res.value.value.toString()) {
  //             const activity = JSON.parse(res.value.value.toString())
  //             results.push(activity)
  //         }

  //         if (res.done) {
  //             await resultsIterator.close()
  //             break
  //         }
  //     }
  //     return results
  // }
}

module.exports = RxContract