/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2020
 */

const expect = require('chai').expect;
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');
const _ = require('lodash');
const YAML = require('yaml');
const debug = require('debug')('config-converter');

const ROOT_DIR = path.resolve(__dirname, '../');
const CONFIG_CONVERTER_CLI = path.resolve(ROOT_DIR, './src/index.js');
const RESOURCES_DIR = path.resolve(ROOT_DIR, './test/resources');

const { DEFAULT_YAML_INDENT } = require('../src/constants');

const stdoutYamlSeparator = '========== Converted YAML configuration ==========';

const extractYamlFromOutput = (stdout) => {
    const idx = stdout.indexOf(stdoutYamlSeparator);
    try {
      if (idx === -1) {
        return YAML.parse(stdout);
      } else {
        return YAML.parse(stdout.substr(idx + stdoutYamlSeparator.length));
      }
    } catch (e) {
      expect(e, 'invalid YAML output').to.be.null;
    }
  },
  execConfigConverter = (...args) => {
    debug('> arguments: %s', args.join(' '));
    const { status, stdout, stderr } = child_process.spawnSync('node', [CONFIG_CONVERTER_CLI, ...args]);
    debug('< exit code: %i', status);
    debug('< stdout: %s', stdout);
    debug('< stderr: %s', stderr);

    return {
      rc: status,
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      yaml: extractYamlFromOutput(stdout.toString()),
    };
  },
  validateValue = (message, expected, actual, exactMatch = false) => {
    if (exactMatch) {
      expect(actual, message).to.equal(expected);
    } else {
      if (!Array.isArray(expected)) {
        expected = [expected];
      }
      for (const one of expected) {
        if (one instanceof RegExp) {
          expect(actual, message).to.match(one);
        } else if (_.isUndefined(one)) {
          expect(actual, message).to.be.undefined;
        } else {
          expect(actual, message).to.have.string(one);
        }
      }
    }
  },
  testConfigConverter = (args = [], expected = {}, exactMatch = false) => {
    const result = execConfigConverter(...args);

    // apply default value
    expected = Object.assign({rc: 0}, expected);

    // check result
    expect(result.rc).to.equal(expected.rc);
    if (_.has(expected, 'stdout')) {
      validateValue('stdout', expected['stdout'], result['stdout'], exactMatch);
    }
    if (_.has(expected, 'stderr')) {
      validateValue('stderr', expected['stderr'], result['stderr'], exactMatch);
    }
    if (_.has(expected, 'yaml')) {
      for (const k in expected['yaml']) {
        const v = _.get(result.yaml, k);
        validateValue(`yaml path "${k}"`, expected['yaml'][k], v, exactMatch);
      }
    }
  },
  getResource = (category, file = 'instance.env') => {
    return path.resolve(RESOURCES_DIR, category, file);
  },
  readYaml = (file) => {
    return YAML.stringify(YAML.parse(fs.readFileSync(file).toString()), {
      indent: DEFAULT_YAML_INDENT,
    });
  };

describe('Zowe instance.env config converter', function () {
  let tmpfile;

  beforeEach(() => {
    tmpfile = null;
  });

  afterEach(() => {
    if (tmpfile) {
      tmpfile.removeCallback();
    }
  });

  it('should show usage help when no arguments are provided', () => {
    testConfigConverter([], {
      rc: 1,
      stdout: '',
      stderr: /^Usage: /,
    });
  });

  it('should show error when input file doesn\'t exist', () => {
    testConfigConverter([getResource('category-doesnot-exist')], {
      rc: 1,
      stdout: '',
      stderr: ['Error reading file', 'ENOENT: no such file or directory'],
    });
  });

  it('should return converted YAML string with valid instance.env input', () => {
    testConfigConverter([getResource('simple')], {
      stdout: readYaml(getResource('simple', 'result.yaml')),
      stderr: '',
      yaml: {
        'zowe.runtimeDirectory': '/ZOWE/staging/zowe',
        'zowe.jobPrefix': 'ZWE1',
        'zowe.identifier': "1",
      }
    }, true);
  });

  it('should show error if cannot source instance.env file', () => {
    testConfigConverter([getResource('invalid')], {
      rc: 1,
      stderr: ['Error reading file', 'Invalid env line'],
    });
  });

  it('should show verbose information if -v is provided', () => {
    testConfigConverter(['-v', getResource('simple')], {
      stdout: ['CLI arguments:', 'Converting:', stdoutYamlSeparator, 'Ignore key SKIP_NODE with value "0"', 'Unknown key UNKNOWN_KEY with value "value"'],
      stderr: '',
      yaml: {
        'components.gateway.debug': 'false',
        'components.discovery.debug': 'false',
        'components.api-catalog.debug': 'false',
        'zowe.environments.UNKNOWN_KEY': 'value',
      }
    });
  });

  it('should enable all components if LAUNCH_COMPONENT_GROUPS=DESKTOP,GATEWAY', () => {
    testConfigConverter(['-v', getResource('components-all')], {
      stderr: '',
      yaml: {
        'components.app-server.enabled': 'true',
        'components.gateway.enabled': 'true',
        'components.explorer-jes.enabled': 'true',
      }
    }, true);
  });

  it('should enable only desktop components if LAUNCH_COMPONENT_GROUPS=DESKTOP', () => {
    testConfigConverter(['-v', getResource('components-desktop')], {
      stderr: '',
      yaml: {
        'components.app-server.enabled': 'true',
        'components.gateway.enabled': undefined,
        'components.explorer-jes.enabled': undefined,
      }
    }, true);
  });

  it('should enable only gateway components if LAUNCH_COMPONENT_GROUPS=GATEWAY', () => {
    testConfigConverter(['-v', getResource('components-gateway')], {
      stderr: '',
      yaml: {
        'components.app-server.enabled': undefined,
        'components.gateway.enabled': 'true',
        'components.explorer-jes.enabled': undefined,
      }
    }, true);
  });

  it('should ignore LAUNCH_COMPONENT_GROUPS if ZWE_LAUNCH_COMPONENTS is defined', () => {
    testConfigConverter([getResource('components-custom')], {
      stderr: '',
      yaml: {
        'components.app-server.enabled': undefined,
        'components.gateway.enabled': undefined,
        'components.explorer-jes.enabled': undefined,
        'components.zss.enabled': 'true',
        'components.abc.enabled': 'true',
      }
    }, true);
  });

  it('should show warning if component is path', () => {
    testConfigConverter(['-v', getResource('components-invalid')], {
      stdout: 'Unsupported component value "/path/to/a/component/bin"',
      stderr: '',
      yaml: {
        'components.compname.enabled': 'true',
        'components.extcomp.enabled': 'true',
      }
    });
  });

  it('should ignore those components if component is path', () => {
    testConfigConverter([getResource('components-invalid')], {
      stderr: '',
      yaml: {
        'components.compname.enabled': 'true',
        'components.extcomp.enabled': 'true',
      }
    }, true);
  });

  it('should add all domains as array if ZWE_EXTERNAL_HOSTS is defined', () => {
    testConfigConverter([getResource('multiple-hosts')], {
      stderr: '',
      stdout: readYaml(getResource('multiple-hosts', 'result.yaml')),
    }, true);
  });

  it('should load keystore definition if KEYSTORE_DIRECTORY is defined', () => {
    testConfigConverter([getResource('cert')], {
      stderr: '',
      yaml: {
        'externalCertificate.keystore.file': '/var/zowe/keystore/localhost/localhost.keystore.p12',
      }
    }, true);
  });

  it('should show error if KEYSTORE_DIRECTORY is invalid', () => {
    testConfigConverter([getResource('cert-no-env')], {
      rc: 1,
      stderr: ['Error loading keystore configs', 'doesn\'t have "zowe-certificates.env" file'],
    });
  });
});
