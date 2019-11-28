'use strict';

const fs = require('fs');
const glob = require('glob');
const path = require('path');
const merge = require('deepmerge');

module.exports = function (options = {}) {
  const defaultWorkingDirectory = path.join(__dirname, '/../../');

  const defaults = {
    workingDirectory: defaultWorkingDirectory,
    contracts: path.join(options.workingDirectory || defaultWorkingDirectory, 'build/contracts/*.json'),
  };

  const opts = merge(defaults, options);

  if ('object' === typeof opts.contracts) {
    if (!Array.isArray(opts.contracts)) {
      return opts.contracts;
    }

    const result = {};
    opts.contracts.forEach((contract) => {
      if (!contract.contractName) {
        throw new Error('Not a truffle contract: expected contractName property');
      }
      result[contract.contractName];
    });
    return result;
  }

  let contractsGlobPath;
  if ('string' === opts.contracts) {
    contractsGlobPath = opts.contracts;
  } else {
    contractsGlobPath = path.join(opts.workingDirectory, 'build/contracts/*.json');
  }

  const files = glob.sync(contractsGlobPath);
  if (!files.length) {
    throw new Error(`No contracts found in directory: ${contractsGlobPath}`);
  }

  const result = {};
  files.forEach((file) => {
    const contract = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(contract);
    if (!parsed.contractName) {
      throw new Error(`Expected property contractName in parsed JSON for file: '${file}'`);
    }
    result[parsed.contractName] = parsed;
  });

  return result;
};
