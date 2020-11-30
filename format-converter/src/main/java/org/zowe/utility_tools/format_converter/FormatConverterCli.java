/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

package org.zowe.utility_tools.format_converter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.util.concurrent.Callable;

import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;

@Command(name = "fconv", header = "@|green JSON YAML format converter|@", sortOptions = false, headerHeading = "Usage:%n%n", synopsisHeading = "%n", parameterListHeading = "%nParameters:%n", optionListHeading = "%nOptions:%n")
public class FormatConverterCli implements Callable<Integer> {
    private static Logger logger = LoggerFactory.getLogger(FormatConverterCli.class);

    @Parameters(index = "0", description = "YAML or JSON file")
    File inputFile;

    @Option(names = { "--input-encoding" }, description = "UTF8, ISO8859-1, Cp1047, ... - see https://goo.gl/yn2pJZ")
    String inputEncoding;

    @Option(names = { "-o", "--output" }, description = "Output file (default: print to console)")
    File outputFile;

    @Option(names = { "--output-encoding" }, description = "UTF8, ISO8859-1, Cp1047, ...")
    String outputEncoding;

    public static void main(String... args) {
        int exitCode = new CommandLine(new FormatConverterCli()).execute(args);
        System.exit(exitCode);
    }

    @Override
    public Integer call() throws Exception { // your business logic goes here...
        logger.info("{} => {}", inputFile, outputFile);
        return 0;
    }
}
