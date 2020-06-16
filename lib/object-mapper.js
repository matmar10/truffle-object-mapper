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
      // TODO this should live inside buildOutputMapping
      // _mapping[key] holds field-specific transformation
      // mapping[key] is overriden mapping passed-in
      const customMapping = this._mapping[key] ?
        this._mapping[key] :
        mapping[key];
      map[key] = this.buildOutputMapping(key, output.type, customMapping);
    });

    return objectMapper(values, map);
  }

  buildOutputMapping(key, type, customMapping) {
    // order:
    // - exact match on type, ex: bytes32
    // - general match on alias, ex: uint8 matches uint
    // - noop
    const transform = this.getDefaultTransformationForType(type);
    const defaultMapping = { key, transform };
    if (!customMapping) {
      return defaultMapping;
    }
    if (!Array.isArray(customMapping)) {
      customMapping = [customMapping];
    }
    return customMapping.map((original) => {
      if ('string' === typeof original) {
        return merge(defaultMapping, {
          key: original,
        });
      }
      return merge(defaultMapping, original);
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
