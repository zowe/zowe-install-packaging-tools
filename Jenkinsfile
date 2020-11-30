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


node('ibm-jenkins-slave-nvm') {
  def lib = library("jenkins-library").org.zowe.jenkins_shared_library

  def pipeline = lib.pipelines.gradle.GradlePipeline.new(this)
  def uniqueBuildId

  pipeline.admins.add("jackjia")

  pipeline.setup()

  pipeline.build()

  // pipeline.test(
  //   name          : 'Unit',
  //   operation     : {
  //       sh './gradlew coverage'
  //   },
  //   junit         : '**/test-results/test/*.xml',
  //   htmlReports   : [
  //     [dir: "build/reports/jacoco/jacocoFullReport/html", files: "index.html", name: "Report: Code Coverage"],
  //     [dir: "jobs-api-server/build/reports/tests/test", files: "index.html", name: "Report: Unit Test"],
  //   ],
  // )

  pipeline.packaging(
      name: 'zowe-utility-tools',
      operation: {
          sh './gradlew packageZoweUtilityTools'
      }
  )

  pipeline.publish(
    artifacts: [
      'zowe-utility-tools-package/build/distributions/zowe-utility-tools.zip'
    ],
    allowPublishWithoutTest: true
  )

  // define we need release stage
  pipeline.release()

  pipeline.end()
}
