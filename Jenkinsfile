#!groovy

/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2018, 2020
 */


node('zowe-jenkins-agent') {
  def lib = library("jenkins-library").org.zowe.jenkins_shared_library

  def pipeline = lib.pipelines.gradle.GradlePipeline.new(this)

  pipeline.admins.add("jackjia")

  pipeline.setup()

  pipeline.build()

  pipeline.test(
    name          : 'Unit',
    operation     : {
        sh './gradlew --info test coverage'
    },
    junit         : '**/test-results/test/*.xml',
    htmlReports   : [
      [dir: "fconv/.reports/lcov-report", files: "index.html", name: "Format Converter: Code Coverage"],
      [dir: "fconv/.reports/unit-test", files: "index.html", name: "Format Converter: Unit Test"],
      [dir: "njq/.reports/lcov-report", files: "index.html", name: "Node JQ: Code Coverage"],
      [dir: "njq/.reports/unit-test", files: "index.html", name: "Node JQ: Unit Test"],
    ],
  )

  pipeline.packaging(
      name: 'zowe-utility-tools',
      operation: {
          sh './gradlew packageZoweUtilityTools'
      }
  )

  pipeline.publish(
    artifacts: [
      'zowe-utility-tools-package/build/distributions/zowe-utility-tools.zip'
    ]
  )

  pipeline.release()

  pipeline.end()
}
