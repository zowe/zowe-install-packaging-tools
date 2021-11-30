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
const YAML = require('yaml');
const tmp = require('tmp');
const debug = require('debug')('format-converter');

const ROOT_DIR = path.resolve(__dirname, '../');
const FORMAT_CONVERTER_CLI = path.resolve(ROOT_DIR, './src/index.js');
const RESOURCES_DIR = path.resolve(ROOT_DIR, './test/resources');

const DEFAULT_INDENT = 2;

const execFormatConverter = (...args) => {
    debug('> arguments: %s', args.join(' '));
    const { status, stdout, stderr } = child_process.spawnSync('node', [FORMAT_CONVERTER_CLI, ...args]);
    debug('< exit code: %i', status);
    debug('< stdout: %s', stdout);
    debug('< stderr: %s', stderr);

    return {
      rc: status,
      stdout: stdout.toString(),
      stderr: stderr.toString(),
    };
  },
  testFormatConverter = (args = [], expected = {}, exactMatch = false) => {
    const result = execFormatConverter(...args);

    // apply default value
    expected = Object.assign({rc: 0, stdout: '', stderr: ''}, expected);

    // check result
    expect(result.rc).to.equal(expected.rc);
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
  },
  readJson = (file) => {
    return JSON.stringify(JSON.parse(fs.readFileSync(file).toString()), null, DEFAULT_INDENT);
  },
  readYaml = (file) => {
    return YAML.stringify(YAML.parse(fs.readFileSync(file).toString()), {
      indent: DEFAULT_INDENT,
    });
  };

describe('YAML / JSON converter', function () {
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
    testFormatConverter([], {
      rc: 1,
      stderr: /^Usage: /,
    });
  });

  it('should show error when input file doesn\'t exist', () => {
    testFormatConverter([getResource('file-doesnot-exist.yaml')], {
      rc: 1,
      stderr: ['error reading input file', 'ENOENT: no such file or directory'],
    });
  });

  it('should return converted JSON string with valid YAML file input', () => {
    testFormatConverter([getResource('test1.yaml')], {
      stdout: readJson(getResource('test1.json')),
    });
  });

  it('should show verbose information if -v is provided', () => {
    testFormatConverter(['-v', getResource('test1.yaml')], {
      stdout: ['CLI arguments:', 'Converting:'],
    });
  });

  it('should show proper error if the input file extension cannot be recognized', () => {
    testFormatConverter([getResource('test2.yaml.unknown')], {
      rc: 1,
      stderr: 'Error: cannot determine input file format. Please supply --input-format option',
    });
  });

  it('should return converted JSON string with --input-format option if file extension cannot be recognized', () => {
    testFormatConverter(['--input-format', 'YAML', getResource('test2.yaml.unknown')], {
      stdout: readJson(getResource('test2.json')),
    });
  });

  it('should return converted YAML string with valid JSON file input', () => {
    testFormatConverter([getResource('test1.json')], {
      stdout: readYaml(getResource('test1.yaml')),
    });
  });

  it('should show error when input encoding is invalid', () => {
    testFormatConverter(['--input-encoding', 'non-exist-encoding', getResource('test1.yaml')], {
      rc: 1,
      // stderr: 'Unknown encoding: non-exist-encoding',
      stderr: '"non-exist-encoding" is invalid',
    });
  });

  it('should show error when input format is invalid', () => {
    testFormatConverter(['--input-format', 'INVALID', getResource('test2.yaml.unknown')], {
      rc: 1,
      stderr: 'input format INVALID is not supported',
    });
  });

  it('should show error when output format is invalid', () => {
    testFormatConverter(['--output-format', 'INVALID', getResource('test1.yaml')], {
      rc: 1,
      stderr: 'output format INVALID is not supported',
    });
  });

  it('should save converted JSON to output file if provide --output option', () => {
    tmpfile = tmp.fileSync();
    debug('temporary file created: %s', tmpfile.name);

    testFormatConverter(['-o', tmpfile.name, getResource('test1.yaml')], {}, true);
    expect(readJson(tmpfile.name)).to.equal(readJson(getResource('test1.json')));
  });

  it('should show error if cannot write to target file', () => {
    testFormatConverter(['--output', '/non-exist-folder/non-exist-path/test1.json', getResource('test1.yaml')], {
      rc: 1,
      stderr: ['error writing output file', 'ENOENT: no such file or directory'],
    });
  });

  it('should show error if cannot read input YAML file', () => {
    testFormatConverter(['--input-format', 'yaml', getResource('test1.yaml.cp1047')], {
      rc: 1,
      stderr: 'error reading input file',
    });
  });

  it('should show error if cannot read input JSON file', () => {
    testFormatConverter(['--input-format', 'json', getResource('test1.json.cp1047')], {
      rc: 1,
      stderr: 'error reading input file',
    });
  });
});
