'use strict';

const Promise = require('bluebird');
const merge = require('deepmerge');
const objectMapper = require('object-mapper');
const { camelCase } = require('camel-case');
const TruffleContract = require('@truffle/contract');
const TruffleConfig = require('@truffle/config');
const TruffleProvider = require('@truffle/provider');
const Web3 = require('Web3');

const abiReader = require('./abi-reader');
const types = require('./types');

const defaults = {
  networkName: 'development',
};

function noop(val) {
  return val;
}

class TruffleObjectMapper {
  constructor(options = {}) {
    this.options = merge(defaults, options);
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
    return new Web3(this.getProvider(this.options));
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

  getDefaultTransformation(type) {
    return this._types[type] || noop;
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
      const customMapping = this._mapping[key] ?
        this._mapping[key] :
        mapping[key];
      map[key] = this.buildOutputMapping(key, output.type, customMapping);
    });

    return objectMapper(values, map);
  }

  buildOutputMapping(key, type, customMapping) {
    const transform = this.getDefaultTransformation(type);
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

TruffleObjectMapper.types = types;

module.exports = TruffleObjectMapper;
