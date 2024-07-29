"use strict";

const { Contract } = require("fabric-contract-api");

class UserContract extends Contract {
  async login(ctx, username, password) {
    const queryString = { selector: { username, password } };
    const resultsIterator = await ctx.stub.getQueryResult(
      JSON.stringify(queryString)
    );
    const result = await resultsIterator.next();
    if (result.value && result.value.value) {
      return JSON.parse(result.value.value.toString());
    } else {
      throw new Error("Invalid username or password");
    }
  }

  async getUser(ctx, id) {
    const userJSON = await ctx.stub.getState(id.toString());
    if (!userJSON || userJSON.length === 0) {
      throw new Error(`User ${id} does not exist`);
    }
    return JSON.parse(userJSON.toString());
  }
}

module.exports = UserContract;
