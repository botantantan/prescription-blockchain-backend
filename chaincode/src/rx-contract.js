'use strict'

const { Contract } = require('fabric-contract-api')

const { Prescription, Activity, generateUniqueID } = require('./util/util')

class RxContract extends Contract {

  async initLedger(ctx) {
    const prescription = new Prescription (1, "memek", 1234, 12355, undefined, 12, true, 3, true, undefined)

    await ctx.stub.putState("1", Buffer.from(JSON.stringify(prescription)))
  }

  async createActivity(ctx, doneAt, prescriptionId, doerId, type, parentIds) {
    const activityId = "1"
    const activity = new Activity(activityId, doneAt, prescriptionId, doerId, type, parentIds);

    return activity
  }

  async getActivity(ctx, activityId) {
      const activityJSON = await ctx.stub.getState(activityId.toString());
      if (!activityJSON || activityJSON.length === 0) {
          throw new Error(`Activity ${activityId} does not exist`);
      }

      return JSON.parse(activityJSON.toString());
  }

  async createRx(ctx, prescriptionId, createdAt, prescribedFor, prescribedBy, medicineId, isIter, iterCount) {
    const prescription = new Prescription(prescriptionId, createdAt, prescribedFor, prescribedBy, undefined, medicineId, isIter, iterCount, true, undefined)
    await ctx.stub.putState(prescriptionId.toString(), Buffer.from(JSON.stringify(prescription)))
    const activity = await this.createActivity(ctx, createdAt, prescriptionId, prescribedBy, "1", undefined)
    await ctx.stub.putState(activity.id, Buffer.from(JSON.stringify(activity)));

    return prescription
  }

  async getRx(ctx, prescriptionId) {
    const prescriptionJSON = await ctx.stub.getState(prescriptionId.toString())
    if (!prescriptionJSON || prescriptionJSON.length === 0) {
        throw new Error(`Prescription ${prescriptionId} does not exist`)
    }
    
    return JSON.parse(prescriptionJSON.toString())
  }

  // asdasdsadadadadasd

  async terminateRx(ctx, id, terminatedAt, doctorId) {
    const prescription = await this.getRx(ctx, id.toString())
    prescription.isValid = false
    prescription.terminatedAt = terminatedAt
    await ctx.stub.putState(id.toString(), Buffer.from(JSON.stringify(prescription)))

    const activityId = generateUniqueID()
    const activity = new Activity(activityId, terminatedAt, id, doctorId, '2', null)
    await ctx.stub.putState(activityId.toString(), Buffer.from(JSON.stringify(activity)))
  }

  async fillRx(ctx, id, pharmacistId) {
    const prescription = await this.getRx(ctx, id)
    if (prescription.isIter) {
        if (parseInt(prescription.iterCount) > 1) {
            // Reduce iterCount by 1
            prescription.iterCount = (parseInt(prescription.iterCount) - 1).toString()
            // Assign filledBy attribute with pharmacist id
            prescription.filledBy = pharmacistId
            await ctx.stub.putState(id, Buffer.from(JSON.stringify(prescription)))

            // Create a new activity type 3 object
            const activityId = generateUniqueID()
            const activity = new Activity(activityId, new Date().toISOString().split('T')[0], id, pharmacistId, '3', null)
            await ctx.stub.putState(activityId, Buffer.from(JSON.stringify(activity)))
        } else if (parseInt(prescription.iterCount) === 1) {
            // Reduce iterCount by 1
            prescription.iterCount = '0'
            await ctx.stub.putState(id, Buffer.from(JSON.stringify(prescription)))
            // Complete the prescription
            await this.completeRx(ctx, id, pharmacistId)
        }
    } else {
        // If isIter is FALSE, complete the prescription
        await this.completeRx(ctx, id, pharmacistId)
    }
  }

  async completeRx(ctx, id, pharmacistId) {
    const prescription = await this.getRx(ctx, id)
    prescription.isValid = false
    prescription.filledBy = pharmacistId
    await ctx.stub.putState(id, Buffer.from(JSON.stringify(prescription)))

    const activityId = generateUniqueID()
    const activity = new Activity(activityId, new Date().toISOString().split('T')[0], id, pharmacistId, '4', null)
    await ctx.stub.putState(activityId, Buffer.from(JSON.stringify(activity)))
  }

  // async createActivityHistory(ctx, prescriptionId) {
  //     const activities = await this.getActivitiesByPrescription(ctx, prescriptionId);
  //     return activities.sort((a, b) => new Date(a.doneAt).getTime() - new Date(b.doneAt).getTime());
  // }

  // async getActivityHistory(ctx, prescriptionId) {
  //     return await this.createActivityHistory(ctx, prescriptionId);
  // }

  // async getActivitiesByPrescription(ctx, prescriptionId) {
  //     const queryString = JSON.stringify({
  //         selector: {
  //             prescriptionId
  //         }
  //     });

  //     const resultsIterator = await ctx.stub.getQueryResult(queryString);
  //     const results = [];

  //     while (true) {
  //         const res = await resultsIterator.next();

  //         if (res.value && res.value.value.toString()) {
  //             const activity = JSON.parse(res.value.value.toString());
  //             results.push(activity);
  //         }

  //         if (res.done) {
  //             await resultsIterator.close();
  //             break;
  //         }
  //     }
  //     return results;
  // }
}

module.exports = RxContract