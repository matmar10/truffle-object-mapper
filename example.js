'use strict';

const Mapper = require('./');
const Web3 = require('web3');

function bNToString(val) {
  return Web3.utils.BN(val).toString();
}

const mapper = new Mapper({
  mapping: {
    state: [
      {
        key: 'state',
        transform: function (val) {
          const index = Number(val.toString());
          const states = ['Funding', 'Active', 'Matured'];
          return states[index];
        },
      },
      'stateName',
    ],
  },
  types: {
    int8: bNToString,
    uint256: bNToString,
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
