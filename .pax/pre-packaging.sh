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

convert_encoding() {
  file=$1

  echo "- converting ${file}"
  iconv -f IBM-1047 -t IBM-850 "${file}" > "${file}.tmp"
  mv "${file}.tmp" "${file}"
}

cd "${BASE_DIR}/content"

echo "[${SCRIPT_NAME}] init gradle ..."
export GRADLE_OPTS=-Djava.io.tmpdir=/ZOWE/tmp
export GRADLE_USER_HOME=-Djava.io.tmpdir=/ZOWE/tmp
./bootstrap_gradlew.sh

echo "[${SCRIPT_NAME}] fix gradle files encoding ..."
files="settings.gradle $(find . -name build.gradle)"
for file in ${files}; do
  convert_encoding "${file}"
done

echo "[${SCRIPT_NAME}] build projects ..."
./gradlew assemble

echo "[${SCRIPT_NAME}] packaging projects ..."
./gradlew packageZoweUtilityTools

echo "[${SCRIPT_NAME}] done"
