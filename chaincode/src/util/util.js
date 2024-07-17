'use strict'

const { v4: uuidv4 } = require('uuid');

class Prescription {
  constructor(id, createdAt, prescribedFor, prescribedBy, filledBy, medicineId, isIter, iterCount, isValid, terminatedAt) {
    this.id = id;
    this.createdAt = createdAt;
    this.prescribedFor = prescribedFor;
    this.prescribedBy = prescribedBy;
    this.filledBy = filledBy;
    this.medicineId = medicineId;
    this.isIter = isIter;
    this.iterCount = iterCount;
    this.isValid = isValid;
    this.terminatedAt = terminatedAt;
  }
}

class Medicine {
  constructor(id, name, description, dosage) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.dosage = dosage;
  }
}

class Activity {
  constructor(id, doneAt, prescriptionId, doerId, type, parentId) {
    this.id = id;
    this.doneAt = doneAt;
    this.prescriptionId = prescriptionId;
    this.doerId = doerId;
    this.type = type;
    this.parentId = parentId;
  }
}

class User {
  constructor(id, username, password, role) {
    this.id = id;
    this.username = username;
    this.password = password;
    this.role = role;
  }
}

function generateUniqueID() {
  return uuidv4();
}

module.exports = {
  Prescription,
  Medicine,
  Activity,
  User,
  generateUniqueID
}