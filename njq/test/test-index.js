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
const child_process = require('child_process');
const debug = require('debug')('node-jq');

const ROOT_DIR = path.resolve(__dirname, '../');
const NODE_JQ_CLI = path.resolve(ROOT_DIR, './src/index.js');
const RESOURCES_DIR = path.resolve(ROOT_DIR, './test/resources');

const execFormatConverter = (...args) => {
    debug('> arguments: %s', args.join(' '));
    const { status, stdout, stderr } = child_process.spawnSync('sh', ['-c', ['node', NODE_JQ_CLI, ...args].join(' ')]);
    // const { status, stdout, stderr } = child_process.spawnSync('node', [NODE_JQ_CLI, ...args]);
    debug('< exit code: %i', status);
    debug('< stdout: %s', stdout);
    debug('< stderr: %s', stderr);

    return {
      rc: status,
      stdout: stdout.toString(),
      stderr: stderr.toString(),
    };
  },
  testNodeJq = (args = [], expected = {}, exactMatch = false) => {
    const result = execFormatConverter(...args);

    // apply default value
    expected = Object.assign({rc: 0, stdout: '', stderr: ''}, expected);

    // check result
    if (exactMatch) {
      expect(result.rc).to.equal(expected.rc);
    } else {
      if (expected.rc instanceof RegExp) {
        expect(`${result.rc}`).to.match(expected.rc);
      } else {
        if (!Array.isArray(expected.rc)) {
          expected.rc = [expected.rc];
        }
        expect(result.rc).to.be.oneOf(expected.rc);
      }
    }
    for (const key of ['stdout', 'stderr']) {
      if (exactMatch) {
        expect(result[key]).to.equal(expected[key]);
      } else {
        if (!Array.isArray(expected[key])) {
          expected[key] = [expected[key]];
        }
        for (const one of expected[key]) {
          if (one instanceof RegExp) {
            expect(result[key]).to.match(one);
          } else {
            expect(result[key]).to.have.string(one);
          }
        }
      }
    }
  },
  getResource = (file) => {
    return path.resolve(RESOURCES_DIR, file);
  };

describe('node.js jq parser', function () {
  it('should show usage help when no arguments are provided', () => {
    testNodeJq([], {
      rc: 1,
      stderr: /^Usage: /,
    });
  });

  it('should return name stored in JSON if as string we redirect a JSON file as input', () => {
    testNodeJq([".name", "<", getResource('test1.json')], {
      stdout: '"Test File 1"\n',
    }, true);
  });

  it('should return raw name stored in JSON if we redirect a JSON file as input', () => {
    testNodeJq(["-r", ".name", "<", getResource('test1.json')], {
      stdout: 'Test File 1\n',
    }, true);
  });

  it('should return name stored in JSON if as string we use a JSON file as second argument', () => {
    testNodeJq(["-i", getResource('test1.json'), ".name"], {
      stdout: '"Test File 1"\n',
    }, true);
  });

  it('should return raw name stored in JSON if we use a JSON file as second argument', () => {
    testNodeJq(["-r", "-i", getResource('test1.json'), ".name"], {
      stdout: 'Test File 1\n',
    }, true);
  });

  it('should show verbose information if -v is provided', () => {
    testNodeJq(["-v", ".name", "<", getResource('test1.json')], {
      stdout: ['CLI arguments:', 'Parse stdin with jq filter(s):'],
    });
  });

  it('should show null if the filter doesn\'t exist', () => {
    testNodeJq(["-i", getResource('test1.json'), ".doesnotExits"], {
      stdout: 'null\n',
    }, true);
  });

  it('should show all array elements if we filter on array of object key', () => {
    testNodeJq(["-i", getResource('test1.json'), ".array_example[].key2"], {
      stdout: '"object element value 1-2"\n"object element value 2-2"\n"object element value 3-2"\n',
    }, true);
  });

  it('should show multiple lines of array elements when we filter on array', () => {
    testNodeJq(["-r", "-i", getResource('test1.json'), ".simple_array"], {
      stdout: 'element 1\nelement 2\nelement 3\n',
    }, true);
  });

  it('should show array element when we filter on specified element of array', () => {
    testNodeJq(["-r", "-i", getResource('test1.json'), ".array_example[2]"], {
      stdout: '{"key1":"object element value 3-1","key2":"object element value 3-2","key3":"object element value 3-3"}\n',
    }, true);
  });

  it('should return file not found if specify a wrong file as input', () => {
    testNodeJq(["-i", getResource('file-doesnot-exist.json'), ".name"], {
      rc: 1,
      // this error comes from node.js
      stderr: 'no such file or directory',
    });
  });

  it('should return file not found if specify a wrong file and try to redirect it as input', () => {
    testNodeJq([".name", "<", getResource('file-doesnot-exist.json')], {
      // seems rc varies based on OS. mac returns 1, but ubuntu returns 2, so let's check non-zero
      rc: /^(?!0$)\d+$/,
      // this error comes from shell
      stderr: 'No such file',
    });
  });

  it('should return file not found if specify a wrong file as input', () => {
    testNodeJq(["-v", "-i", getResource('file-doesnot-exist.json'), ".name"], {
      rc: 1,
      // this error comes from node.js
      stderr: ['no such file or directory', 'test/resources/file-doesnot-exist.json', 'at Object.openSync'],
    });
  });

  it('should show variable assignment when we define variable name as part of filter', () => {
    testNodeJq(["-i", getResource('test1.json'), "'<my_var>.array_example[2]'"], {
      stdout: 'my_var={"key1":"object element value 3-1","key2":"object element value 3-2","key3":"object element value 3-3"}\n',
    }, true);
  });

  it('should show multiple responses when we define multiple filters', () => {
    testNodeJq(["-i", getResource('test1.json'), "'.array_example[2]'", "'.name'"], {
      stdout: '{"key1":"object element value 3-1","key2":"object element value 3-2","key3":"object element value 3-3"}\n"Test File 1"\n',
    }, true);
  });

  it('should show multiple variable assignments when we define multiple filters with variable names', () => {
    testNodeJq(["-i", getResource('test1.json'), "'<my_var1>.array_example[2]'", "'<my_var2>.name'"], {
      stdout: 'my_var1={"key1":"object element value 3-1","key2":"object element value 3-2","key3":"object element value 3-3"}\nmy_var2="Test File 1"\n',
    }, true);
  });
});
