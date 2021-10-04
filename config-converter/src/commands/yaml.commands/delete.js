/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const { deleteYamlProperty } = require('../../libs/yaml');

const builder = (yargs) => {
  yargs
    .options({});
};

const handler = async (options) => {
  if (options.verbose) {
    process.stdout.write(`Deleting "${options.pathOfObject}" from ${options.yamlFile}\n`);
  }

  deleteYamlProperty(options.yamlFile, options.pathOfObject);
};

module.exports = {
  command: 'delete <yaml-file> <path-of-object>',
  description: 'Delete a property from YAML configuration without losing comments and format',
  builder,
  handler,
};
