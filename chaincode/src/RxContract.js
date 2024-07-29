"use strict";

const { Contract } = require("fabric-contract-api");
const { Prescription, Activity } = require("./utils/util");

class RxContract extends Contract {
  constructor() {
    super("RxContract");
    this.activityIdCounter = "1";
  }

  async initLedger(ctx) {
    const prescriptions = [
      new Prescription(
        "rx-1",
        "2024-07-18,00:01",
        "1001",
        "2001",
        "1",
        "0",
        "0"
      ),
      new Prescription(
        "rx-2",
        "2024-07-18,00:10",
        "1002",
        "2002",
        "2",
        "0",
        "0"
      ),
      new Prescription(
        "rx-3",
        "2024-07-18,13:00",
        "1003",
        "2003",
        "3",
        "0",
        "0"
      ),
      new Prescription(
        "rx-4",
        "2024-07-18,25:00",
        "1004",
        "2004",
        "4",
        "1",
        "5"
      ),
      new Prescription(
        "rx-5",
        "2024-07-18,17:00",
        "1001",
        "2002",
        "5",
        "1",
        "3"
      ),
      new Prescription(
        "rx-6",
        "2024-07-18,22:00",
        "1006",
        "2006",
        "6",
        "1",
        "2"
      ),
    ];

    for (const prescription of prescriptions) {
      await this.createRx(
        ctx,
        prescription.prescriptionId,
        prescription.creationDate,
        prescription.patientId,
        prescription.doctorId,
        prescription.medicineId,
        prescription.isIter,
        prescription.iterCount
      );
    }
  }

  async getAssetObject(ctx, assetId) {
    const assetJSON = await ctx.stub.getState(assetId);
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`Asset: ${assetId} does not exist`);
    }

    return JSON.parse(assetJSON.toString()); // object
  }

  // getAsset returns the asset stored in the world state with given id.
  async getAsset(ctx, assetId) {
    const assetJSON = await ctx.stub.getState(assetId); // get the asset from chaincode state
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`Asset: ${assetId} does not exist`);
    }
    console.log(assetJSON);
    const strValue = JSON.parse(assetJSON.toString("utf8"));
    console.log(strValue);

    return strValue;
  }

  async getAllAssets(ctx) {
    const allResults = [];
    // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString(
        "utf8"
      );
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      allResults.push(record);
      result = await iterator.next();
    }

    return JSON.stringify(allResults, null, 2);
  }

  // AssetExists returns true when asset with given ID exists in world state.
  async assetExist(ctx, assetId) {
    const assetJSON = await ctx.stub.getState(assetId);
    return assetJSON && assetJSON.length > 0;
  }

  async createActivity(
    ctx,
    timestamp,
    prescriptionId,
    actorId,
    type,
    parentId
  ) {
    const activityId = `act-${this.activityIdCounter}`;
    const activity = new Activity(
      activityId,
      timestamp,
      prescriptionId,
      actorId,
      type,
      parentId
    );
    this.activityIdCounter = (Number(this.activityIdCounter) + 1).toString();

    return activity;
  }

  // get parentId if exist else null
  async getParentId(ctx, prescriptionId) {
    const queryString = JSON.stringify({
      selector: {
        docType: "activity",
        prescriptionId,
      },
      sort: [{ timestamp: "desc" }],
      limit: 1,
    });

    const iterator = await ctx.stub.getQueryResult(queryString);
    const result = await iterator.next();
    if (result.value) {
      const activity = JSON.parse(result.value.value.toString("utf8"));
      return activity.activityId;
    }
    return null;
  }

  async createRx(
    ctx,
    prescriptionId,
    creationDate,
    patientId,
    doctorId,
    medicineId,
    isIter,
    iterCount
  ) {
    const exists = await this.assetExist(ctx, prescriptionId);
    if (exists) {
      throw new Error(`Asset: ${prescriptionId} already exist`);
    }

    const prescription = new Prescription(
      prescriptionId,
      creationDate,
      patientId,
      doctorId,
      medicineId,
      isIter,
      iterCount
    );
    await ctx.stub.putState(
      prescription.prescriptionId,
      Buffer.from(JSON.stringify(prescription))
    );

    const activity = await this.createActivity(
      ctx,
      creationDate,
      prescriptionId,
      doctorId,
      "1",
      null
    );
    await ctx.stub.putState(
      activity.activityId,
      Buffer.from(JSON.stringify(activity))
    );

    return prescription;
  }

  async terminateRx(ctx, prescriptionId, terminationDate, doctorId) {
    const exists = await this.assetExist(ctx, prescriptionId);
    if (!exists) {
      throw new Error(`Asset: ${prescriptionId} does not exist`);
    }

    const prescription = await this.getAssetObject(ctx, prescriptionId);

    if (Boolean(Number(prescription.isValid))) {
      prescription.isValid = "0";
      prescription.terminationDate = terminationDate;
      await ctx.stub.putState(
        prescriptionId,
        Buffer.from(JSON.stringify(prescription))
      );
      const parentId = await this.getParentId(ctx, prescriptionId);
      const activity = await this.createActivity(
        ctx,
        terminationDate,
        prescriptionId,
        doctorId,
        "2",
        parentId
      );
      await ctx.stub.putState(
        activity.activityId,
        Buffer.from(JSON.stringify(activity))
      );
    } else {
      throw new Error(
        `Asset: ${prescriptionId} has already been terminated/completed`
      );
    }
  }

  async fillRx(ctx, prescriptionId, filledDate, pharmacistId) {
    const exists = await this.assetExist(ctx, prescriptionId);
    if (!exists) {
      throw new Error(`Asset: ${prescriptionId} does not exist`);
    }

    const prescription = await this.getAssetObject(ctx, prescriptionId);

    if (Boolean(Number(prescription.isValid))) {
      if (Boolean(Number(prescription.isIter))) {
        if (Number(prescription.iterCount) > 1) {
          prescription.iterCount = (
            Number(prescription.iterCount) - 1
          ).toString();
          prescription.pharmacistId = pharmacistId;
          await ctx.stub.putState(
            prescriptionId,
            Buffer.from(JSON.stringify(prescription))
          );

          const parentId = await this.getParentId(ctx, prescriptionId);
          const activity = await this.createActivity(
            ctx,
            filledDate,
            prescriptionId,
            pharmacistId,
            "3",
            parentId
          );
          await ctx.stub.putState(
            activity.activityId,
            Buffer.from(JSON.stringify(activity))
          );
        } else if (Number(prescription.iterCount) === 1) {
          prescription.isIter = "0";
          prescription.iterCount = "0";

          await this.completeRx(ctx, prescription, filledDate, pharmacistId);
        }
      } else {
        await this.completeRx(ctx, prescription, filledDate, pharmacistId);
      }
    } else {
      throw new Error(
        `Asset: ${prescriptionId} has already been terminated/completed`
      );
    }
  }

  async completeRx(ctx, prescription, filledDate, pharmacistId) {
    prescription.isValid = "0";
    prescription.terminationDate = filledDate;
    prescription.pharmacistId = pharmacistId;
    await ctx.stub.putState(
      prescription.prescriptionId,
      Buffer.from(JSON.stringify(prescription))
    );

    const parentId = await this.getParentId(ctx, prescription.prescriptionId);
    const activity = await this.createActivity(
      ctx,
      filledDate,
      prescription.prescriptionId,
      pharmacistId,
      "4",
      parentId
    );
    await ctx.stub.putState(
      activity.activityId,
      Buffer.from(JSON.stringify(activity))
    );
  }

  async getRxHistory(ctx, prescriptionId) {
    const query = {
      selector: {
        docType: "activity",
        prescriptionId,
      },
      sort: [{ timestamp: "asc" }],
    };

    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const activities = [];
    while (true) {
      const result = await iterator.next();
      if (result.done) {
        break;
      }
      const activity = result.value.value.toString("utf8");
      activities.push(JSON.parse(activity));
    }

    return JSON.stringify(activities);
  }
}

module.exports = RxContract;
