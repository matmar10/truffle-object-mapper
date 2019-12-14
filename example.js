'use strict';

const Web3 = require('web3');
const moment = require('moment');

const Mapper = require('./');

function bNToString(val) {
  return Web3.utils.BN(val).toString();
}

const mapper = new Mapper({
  mapping: {
    state: [
      {
        key: 'stateName',
        transform: function (val) {
          const index = Number(val.toString());
          const states = ['Funding', 'Active', 'Matured'];
          return states[index];
        },
      },
      {
        key: 'state',
        transform: val => val.toNumber(),
      },
    ],
    maturityDeadline: {
      transform: function (val) {
        return moment.unix(val.toNumber());
      },
    },
  },
  types: {
    bytes: Web3.utils.hexToUtf8,
    int: bNToString,
    uint: bNToString,
  },
  workingDirectory: __dirname,
});

(async () => {
  try {
    const values = await mapper.map('Token', '0x468d834b0FAc4B9D8B2E90bE1cE35A891Ff96Ae9');
    console.log(values);
  } catch (err) {
    console.error(err);
  }
})();
