"use strict";

class Prescription {
  constructor(prescriptionId, creationDate, patientId, doctorId, medicineId, isIter, iterCount) {
    this.docType = 'prescription';  // Adding docType
    this.prescriptionId = prescriptionId;
    this.creationDate = creationDate;
    this.patientId = patientId;
    this.doctorId = doctorId;
    this.medicineId = medicineId;
    this.isIter = isIter;
    this.iterCount = iterCount;
    this.isValid = '1';
    this.pharmacistId = null;
    this.terminationDate = null;
  }
}

class Activity {
  constructor(activityId, timestamp, prescriptionId, actorId, type, parentId) {
    this.docType = 'activity';  // Adding docType
    this.activityId = activityId;
    this.timestamp = timestamp;
    this.prescriptionId = prescriptionId;
    this.actorId = actorId;
    this.type = type;
    this.parentId = parentId;
  }
}

class Medicine {
  constructor(medicineId, name, description, dosage) {
    this.docType = 'medicine'
    this.medicineId = medicineId;
    this.name = name;
    this.description = description;
    this.dosage = dosage;
  }
}

class User {
  constructor(userId, username, password, role) {
    this.docType = 'user'
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
