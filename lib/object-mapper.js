'use strict';

const Promise = require('bluebird');
const Ajv = require('ajv');
const merge = require('deepmerge');
const objectMapper = require('object-mapper');
const { camelCase } = require('camel-case');
const TruffleContract = require('@truffle/contract');
const TruffleConfig = require('@truffle/config');
const TruffleProvider = require('@truffle/provider');
const Web3 = require('web3');

const abiReader = require('./abi-reader');
const types = require('./types');
const optionsSchema = require('./options.schema');

const defaults = {
  networkName: 'development',
};

function noop(val) {
  return val;
}

function assertValidateOptions(options) {
  const ajv = new Ajv({ allErrors: true });
  const valid = ajv.validate(optionsSchema, options);
  if (!valid) {
    const err = new Error('Invalid options for ObjectMapper');
    err.errors = ajv.errors;
    throw err;
  }
}

class TruffleObjectMapper {
  constructor(options = {}) {
    this.options = merge(defaults, options);
    assertValidateOptions(this.options);
    this.artifacts = {};
    this._types = merge(TruffleObjectMapper.types, options.types || {});
    this._mapping = this.options.mapping || {};
  }

  getArtifact(contractName) {
    if (!Object.keys(this.artifacts).length) {
      this.artifacts = abiReader(this.options);
    }
    if (!this.artifacts[contractName]) {
      throw new Error(`No artifact found for contract name ${contractName}`);
    }
    return this.artifacts[contractName];
  }

  getWeb3() {
    return new Web3(this.getProvider());
  }

  getProvider() {
    if (this.options.provider) {
      return this.options.provider;
    }
    const truffleOptions = merge({
      network: this.options.networkName,
      workingDirectory: this.options.workingDirectory,
    }, this.options);
    const truffleConfig = TruffleConfig.detect(truffleOptions);
    return TruffleProvider.create(truffleConfig);
  }

  methodNameToPropertyName(methodName) {
    return 0 === methodName.indexOf('get') ?
      camelCase(methodName.substring(3)) : methodName;
  }

  getFilteredNodeList(contractName) {
    const artifact = this.getArtifact(contractName);
    return artifact.abi.filter(node => 'function' === node.type
      && 'view' === node.stateMutability
      && !node.inputs.length);
  }

  getAliasForType(type) {
    const aliases = Object.keys(TruffleObjectMapper.typeAliasesRegex);
    for (let i = 0; i < aliases.length; i++) {
      const alias = aliases[i];
      const regex = TruffleObjectMapper.typeAliasesRegex[alias];
      if (regex.test(type)) {
        return alias;
      }
    }
    return false;
  }

  getDefaultTransformationForAlias(type) {
    const alias = this.getAliasForType(type);
    if (!alias) {
      return false;
    }
    return this._types[alias];
  }

  getDefaultTransformationForType(type) {
    const defaultForAlias = this.getDefaultTransformationForAlias(type);
    return this._types[type] ? this._types[type] : defaultForAlias || noop;
  }

  async map(contractName, at, mapping = {}) {
    let instance;
    if ('object' === contractName) {
      instance = contractName;
      mapping = at;
    } else {
      const artifact = this.getArtifact(contractName);
      const Contract = TruffleContract(artifact);
      Contract.setProvider(this.getProvider());
      instance = await Contract.at(at);
    }

    const nodes = this.getFilteredNodeList(contractName);
    const values = {};
    const map = {};
    await Promise.each(nodes, async (node) => {
      const key = this.methodNameToPropertyName(node.name);
      const value = await instance[node.name]();
      values[key] = value;
      const [output] = node.outputs;
      map[key] = this.buildOutputMapping(key, output.type, mapping[key]);
    });

    return objectMapper(values, map);
  }

  buildOutputMapping(key, type, customMappingForKey) {
    // Part A) Mapping
    // Mapping order (only one is invoked):
    // 1. Custom mapping for key (this method invokation)
    // 2. Mapping for key (pre-configured)
    //
    // Part B) Transformation
    // Transformation order (only one invoked):
    // 1. Mapping transformer
    // 2. Type transformation (pre-configured)

    // Part A) Mapping
    const mapping = customMappingForKey || this._mapping[key] || [{ key }];
    const mappingAsArray = Array.isArray(mapping) ? mapping : [mapping];

    // Part B) Transformation
    const defaultTransformationForType = this.getDefaultTransformationForType(type);

    return mappingAsArray.map((map) => {
      const normalizedMap = 'string' === typeof map ? { key: map } : map;
      normalizedMap.transform = normalizedMap.transform || defaultTransformationForType || noop;
      return normalizedMap;
    });
  }
}

TruffleObjectMapper.typeAliasesRegex = {
  bytes: /^bytes/,
  int: /^int/,
  uint: /^uint/,
};

TruffleObjectMapper.types = types;

module.exports = TruffleObjectMapper;
