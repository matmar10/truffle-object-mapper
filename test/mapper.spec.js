'use strict';

/* global before, describe, it */
const chai = require('chai');
const BN = require('bn.js');
// Enable and inject BN dependency
chai.use(require('chai-bn')(BN));

const Mapper = require('./../');
const TruffleProvider = require('@truffle/provider');
const TruffleConfig = require('@truffle/config');

const deployedAddress = '0x254dffcd3277C0b1660F6d42EFbB754edaBAbC2B';

describe('Mapper', function () {
  let mapper;

  before(function () {
    mapper = new Mapper({
      workingDirectory: __dirname,
    });
  });

  describe('map', function () {
    it('uses defaults', async function () {
      const values = await mapper.map('MetaCoin', deployedAddress);
      chai.expect(values).to.have.property('bytes32Example', 'bytes 32 example');
      chai.expect(values).to.have.property('addressExample', '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B');
      chai.expect(values.uintExample).to.be.a.bignumber.that.equals(new BN('100'));
      chai.expect(values.intExample).to.be.a.bignumber.that.equals(new BN('-200'));
    });
    it('maps properties', async function () {
      const values = await mapper.map('MetaCoin', deployedAddress, {
        bytes32Example: 'bytes32ExampleNewName',
        addressExample: {
          key: 'addressExampleNewName',
          transform: val => val.toLowerCase(),
        },
        uintExample: [
          'uintExampleNewName1',
          {
            key: 'uintExampleNewName2',
          }, {
            key: 'uintExampleNewName3',
            transform: val => val.add(new BN('50')),
          },
        ],
      });
      chai.expect(values).to.not.have.property('bytes32Example');
      chai.expect(values).to.have.property('bytes32ExampleNewName', 'bytes 32 example');

      chai.expect(values).to.not.have.property('addressExample');
      chai.expect(values).to.have.property('addressExampleNewName', '0xab5801a7d398351b8be11c439e05c5b3259aec9b');

      chai.expect(values).to.not.have.property('uintExample');
      chai.expect(values.uintExampleNewName1).to.be.a.bignumber.that.equals(new BN('100'));
      chai.expect(values.uintExampleNewName2).to.be.a.bignumber.that.equals(new BN('100'));
      chai.expect(values.uintExampleNewName3).to.be.a.bignumber.that.equals(new BN('150'));

      // chai.expect(values).to.not.have.property('intExample');
      chai.expect(values.intExample).to.be.a.bignumber.that.equals(new BN('-200'));
    });
  });
});


describe('Mapper({ provider })', function () {
  let mapper;
  before(function () {
    mapper = new Mapper({
      provider: TruffleProvider.create(TruffleConfig.detect({
        network: 'development',
        workingDirectory: __dirname,
      })),
      workingDirectory: __dirname,
    });
  });
  describe('map', function () {
    it('uses defaults', async function () {
      const values = await mapper.map('MetaCoin', deployedAddress);
      chai.expect(values).to.have.property('bytes32Example', 'bytes 32 example');
      chai.expect(values).to.have.property('addressExample', '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B');
      chai.expect(values.uintExample).to.be.a.bignumber.that.equals(new BN('100'));
      chai.expect(values.intExample).to.be.a.bignumber.that.equals(new BN('-200'));
    });
    it('maps properties', async function () {
      const values = await mapper.map('MetaCoin', deployedAddress, {
        bytes32Example: 'bytes32ExampleNewName',
        addressExample: {
          key: 'addressExampleNewName',
          transform: val => val.toLowerCase(),
        },
        uintExample: [
          'uintExampleNewName1',
          {
            key: 'uintExampleNewName2',
          }, {
            key: 'uintExampleNewName3',
            transform: val => val.add(new BN('50')),
          },
        ],
      });
      chai.expect(values).to.not.have.property('bytes32Example');
      chai.expect(values).to.have.property('bytes32ExampleNewName', 'bytes 32 example');

      chai.expect(values).to.not.have.property('addressExample');
      chai.expect(values).to.have.property('addressExampleNewName', '0xab5801a7d398351b8be11c439e05c5b3259aec9b');

      chai.expect(values).to.not.have.property('uintExample');
      chai.expect(values.uintExampleNewName1).to.be.a.bignumber.that.equals(new BN('100'));
      chai.expect(values.uintExampleNewName2).to.be.a.bignumber.that.equals(new BN('100'));
      chai.expect(values.uintExampleNewName3).to.be.a.bignumber.that.equals(new BN('150'));

      // chai.expect(values).to.not.have.property('intExample');
      chai.expect(values.intExample).to.be.a.bignumber.that.equals(new BN('-200'));
    });
  });
});
