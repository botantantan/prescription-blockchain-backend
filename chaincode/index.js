'use strict'

const rxContract = require('./src/RxContract')
const userContract = require('./src/UserContract')

module.exports.RxContract = rxContract
module.exports.UserContract = userContract
module.exports.contracts = [rxContract, userContract]