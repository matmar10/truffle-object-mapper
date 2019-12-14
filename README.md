
Truffle Object Mapper
=====================

Quickly and painless dump all the values from a deployed contract.

See [Object Mapper](https://github.com/wankdanker/node-object-mapper#readme) for full details on output mapping syntax.

## Quick Usage

```JavaScript
const Mapper = require('truffle-object-mapper');

// automatically loads truffle.js and contracts from build/contracts
const mapper = new Mapper();

(async () => {
  const values = await mapper.map('Token', '0xf793db07d9952ff75d5371cceb98c4380277503f');
  console.log(values);
})();
```

### Customize Output for Types

```JavaScript
const mapper = new Mapper({
  types: {
    // convert ALL int types to string
    int: function (val) {
      return Web3.utils.BN(val).toString();
    },
    // convert all uint256 to string; default is BN
    uint256: function(val) {
      return Web3.utils.BN(val).toString();
    }
  },
});
const values = await mapper.map('Token', '0xf793db07d9952ff75d5371cceb98c4380277503f');
```

### Provide Custom Output Mapping

See [Object Mapper](https://github.com/wankdanker/node-object-mapper#readme) for full details on output mapping.

```JavaScript

// all calls to .map will apply these transformations
const mapper = new Mapper({
  mapping: {
    // example: 'getState' is a method that returns an integer
    // which represents possible values in a struct
    //
    // This mapping will output two keys:
    //  'state' - the integer itself from getState
    //  'stateName' - the string representing the struct
    State: [
      {
        key: 'stateName',
        transform: function (val) {
          const index = Number(val.toString());
          const states = ['Funding', 'Active', 'Matured'];
          return states[index];
        },
      },
      'state',
    ],
  },
});


```

### Change Output Mapping Each Time

```JavaScript

// this custom mapping only applies to this call of .map
const values = await mapper.map('Token', '0xf793db07d9952ff75d5371cceb98c4380277503f', {
  // map the property 'name' to the output key 'tokenName'
  name: 'tokenName',
  // use a custom transformation
  status: {
    key: 'status',
    transform: function(val) {
      const statuses = {
        0: 'New',
        1: 'Active',
        2: 'Closed'
      };
      const index = val.toString();
      return statuses[index];
    }
  },
  // send a single value to multiple output values
  symbol: ['tokenSymbol', {
    key: 'symbol',
    transform: function(val) {
      return `XYZ:${val}`;
    }
  }],
});
```

## API Methods
