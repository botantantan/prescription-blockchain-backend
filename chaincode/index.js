'use strict'

const rxContract = require('./src/rx-contract')
const userContract = require('./src/user-contract')

module.exports.RxContract = rxContract
module.exports.UserContract = userContract
module.exports.contracts = [rxContract, userContract]