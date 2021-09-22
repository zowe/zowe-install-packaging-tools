/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const builder = (yargs) => {
  return yargs.commandDir('pkcs12.commands').demandCommand().help();
};

module.exports = {
  command: 'pkcs12 <command>',
  aliases: ['pkcs12'],
  description: 'Process PKCS12 certificates.',
  builder,
};
