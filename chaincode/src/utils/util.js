"use strict";

class Prescription {
  constructor(
    prescriptionId,
    creationDate,
    patientId,
    doctorId,
    medicineId,
    isIter,
    iterCount
  ) {
    this.prescriptionId = prescriptionId;
    this.creationDate = creationDate;
    this.patientId = patientId;
    this.doctorId = doctorId;
    this.medicineId = medicineId;
    this.isIter = isIter;
    this.iterCount = iterCount;
    this.isValid = "1"; //  default true
    this.pharmacistId = null; // default null
    this.terminationDate = null; // default null
  }
}

class Activity {
  constructor(activityId, timestamp, prescriptionId, actorId, type) {
    this.activityId = activityId;
    this.timestamp = timestamp;
    this.prescriptionId = prescriptionId;
    this.actorId = actorId;
    this.type = type; // 1 create 2 terminate 3 fill 4 complete
    this.parentId = null; // default null
  }
}

class Medicine {
  constructor(medicineId, name, description, dosage) {
    this.medicineId = medicineId;
    this.name = name;
    this.description = description;
    this.dosage = dosage;
  }
}

class User {
  constructor(userId, username, password, role) {
    this.userId = userId;
    this.username = username;
    this.password = password;
    this.role = role;
  }
}

module.exports = {
  Prescription,
  Activity,
  Medicine,
  User,
};
