'use strict'

class Prescription {
  constructor(id, createdAt, prescribedFor, prescribedBy, medicineId, isIter, iterCount) {
    this.prescriptionId = id
    this.createdAt = createdAt
    this.prescribedFor = prescribedFor
    this.prescribedBy = prescribedBy
    this.medicineId = medicineId
    this.isIter = isIter
    this.iterCount = iterCount
    this.isValid = "1" //  default true
    this.filledBy = null // default null
    this.terminatedAt = null // default null
  }
}

class Activity {
  constructor(id, doneAt, prescriptionId, doerId, type) {
    this.activityId = id
    this.doneAt = doneAt
    this.prescriptionId = prescriptionId
    this.doerId = doerId
    this.type = type // 1 create 2 terminate 3 fill 4 complete
    this.parentId = null // default null
  }
}

class Medicine {
  constructor(id, name, description, dosage) {
    this.id = id
    this.name = name
    this.description = description
    this.dosage = dosage
  }
}

class User {
  constructor(id, username, password, role) {
    this.id = id
    this.username = username
    this.password = password
    this.role = role
  }
}

function syntaxHighlight(json) {
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      var cls = 'number';
      if (/^"/.test(match)) {
          if (/:$/.test(match)) {
              cls = 'key';
          } else {
              cls = 'string';
          }
      } else if (/true|false/.test(match)) {
          cls = 'boolean';
      } else if (/null/.test(match)) {
          cls = 'null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
  });
}

module.exports = {
  Prescription,
  Activity,
  Medicine,
  User,
  syntaxHighlight
}