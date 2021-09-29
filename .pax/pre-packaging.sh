#!/bin/sh -e
#
# SCRIPT ENDS ON FIRST NON-ZERO RC
#
#######################################################################
# This program and the accompanying materials are made available
# under the terms of the Eclipse Public License v2.0 which
# accompanies this distribution, and is available at
# https://www.eclipse.org/legal/epl-v20.html
#
# SPDX-License-Identifier: EPL-2.0
#
# Copyright Contributors to the Zowe Project. 2018, 2020
#######################################################################

#######################################################################
# Build script
#
# runs on z/OS, before creating zowe.pax
#######################################################################
set -x

SCRIPT_NAME=$(basename "$0")  # $0=./pre-packaging.sh
BASE_DIR=$(cd $(dirname "$0"); pwd)      # <something>/.pax

echo "[${SCRIPT_NAME}] list contents of ${BASE_DIR} ..."
find .
