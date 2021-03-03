/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const exitWithError = (message) => {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
};

module.exports = {
  exitWithError,
};
