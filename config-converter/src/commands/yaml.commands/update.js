/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const { updateYaml } = require('../../libs/yaml');

const builder = (yargs) => {
  yargs
    .options({});
};

const handler = async (options) => {
  if (options.verbose) {
    process.stdout.write(`Updating ${options.yamlFile} value of "${options.pathOfObject}" to "${options.newValue}"\n`);
  }

  updateYaml(options.yamlFile, options.pathOfObject, options.newValue);
};

module.exports = {
  command: 'update <yaml-file> <path-of-object> <new-value>',
  description: 'Update YAML configuration without losing comments and format',
  builder,
  handler,
};
