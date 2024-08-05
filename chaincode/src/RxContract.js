"use strict";

const { Contract } = require("fabric-contract-api");
const { Prescription, Activity, User, Medicine } = require("./utils/util");

class RxContract extends Contract {
  constructor() {
    super("RxContract");
    this.activityIdCounter = "1";
  }

  async initLedger(ctx) {
    const users = [
      new User("user-0", "admin", "pass", "admin"),
      new User("user-1", "patient1", "pass", "patient"),
      new User("user-2", "patient2", "pass", "patient"),
      new User("user-3", "patient3", "pass", "patient"),
      new User("user-4", "doctor1", "pass", "doctor"),
      new User("user-5", "doctor2", "pass", "doctor"),
      new User("user-6", "pharmacist1", "pass", "pharmacist"),
      new User("user-7", "pharmacist2", "pass", "pharmacist"),
    ];

    for (const user of users) {
      await ctx.stub.putState(
        user.userId,
        Buffer.from(JSON.stringify(user))
      );
    }

    const medicines = [
      new Medicine("med-1", "paracetamol", "obat mujarab", "200 mg"),
      new Medicine("med-2", "paracetamol", "obat mujarab", "100 mg"),
      new Medicine("med-3", "minoxidil", "obat tampan", "100 amp"),
      new Medicine("med-4", "betadine", "obat alergi", "1000 gram"),
      new Medicine("med-5", "viagra", "obat kanker", "100 mg"),
      new Medicine("med-6", "viagra", "obat kanker", "10 mg"),
      new Medicine("med-7", "ibuprofen", "obat sakit", "100 mg"),
      new Medicine("med-8", "lisinopril", "obat darah tinggi", "100 mg"),
      new Medicine("med-9", "penicilin", "obat aids", "100 mg"),
      new Medicine("med-10", "aptx-4869", "obat anak kecil", "10000 mg")
    ];

    for (const medicine of medicines) {
      await ctx.stub.putState(
        medicine.medicineId,
        Buffer.from(JSON.stringify(medicine))
      );
    }

    const prescriptions = [
      new Prescription("rx-1", "2024-07-30,00:01:00.000", "user-1", "user-4", "med-1,med-10", "0", "0"),
      new Prescription("rx-2", "2024-07-30,00:10:00.000", "user-1", "user-4", "med-2,med-3,med-4", "0", "0"),
      new Prescription("rx-3", "2024-07-30,13:00:00.000", "user-1", "user-4", "med-3", "0", "0"),
      new Prescription("rx-4", "2024-07-30,25:00:00.000", "user-2", "user-5", "med-4,med-5", "1", "5"),
      new Prescription("rx-5", "2024-07-30,17:00:00.000", "user-2", "user-5", "med-6", "1", "3"),
      new Prescription("rx-6", "2024-07-30,22:00:00.000", "user-2", "user-5", "med-7,med-8", "1", "2"),
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

    return JSON.parse(assetJSON.toString());
  }

  async getAsset(ctx, assetId) {
    const assetJSON = await ctx.stub.getState(assetId);
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`Asset: ${assetId} does not exist`);
    }
    return JSON.parse(assetJSON.toString());
  }

  async getAllAssets(ctx) {
    const allResults = [];
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString("utf8");
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

  async assetExist(ctx, assetId) {
    const assetJSON = await ctx.stub.getState(assetId);
    return assetJSON && assetJSON.length > 0;
  }

  async createActivity(ctx, timestamp, prescriptionId, actorId, type, parentId) {
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

  async getParentId(ctx, prescriptionId) {
    const allResults = [];
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString("utf8");
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      if (record.prescriptionId === prescriptionId && record.docType === "activity") {
        allResults.push(record);
      }
      result = await iterator.next();
    }
    allResults.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return allResults.length > 0 ? allResults[0].activityId : null;
  }

  async createRx(ctx, prescriptionId, creationDate, patientId, doctorId, medicineId, isIter, iterCount) {
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
      "create",
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
        "terminate",
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
          prescription.iterCount = (Number(prescription.iterCount) - 1).toString();
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
            "fill",
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
      "complete",
      parentId
    );
    await ctx.stub.putState(
      activity.activityId,
      Buffer.from(JSON.stringify(activity))
    );
  }

  async getRxHistory(ctx, prescriptionId) {
    const allResults = [];
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString("utf8");
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      if (record.prescriptionId === prescriptionId && record.docType === "activity") {
        allResults.push(record);
      }
      result = await iterator.next();
    }
    allResults.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return JSON.stringify(allResults);
  }
}

module.exports = RxContract;
