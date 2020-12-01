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

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.UnsupportedEncodingException;
import java.util.concurrent.Callable;

import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;

@Command(name = "java -jar format-converter-cli.jar", header = "@|green JSON YAML format converter|@", sortOptions = false, headerHeading = "Usage:%n%n", synopsisHeading = "%n", parameterListHeading = "%nParameters:%n", optionListHeading = "%nOptions:%n")
public class FormatConverterCli implements Callable<Integer> {
    private static Logger logger = LoggerFactory.getLogger(FormatConverterCli.class);

    @Parameters(index = "0", description = "YAML or JSON file")
    File inputFile;

    @Option(names = { "--input-encoding" }, description = "UTF8, ISO8859-1, Cp1047, ... - see https://goo.gl/yn2pJZ")
    String inputEncoding;

    @Option(names = { "--input-format" }, description = "YAML or JSON")
    String inputFormat;

    private FileFormat inputFileFormat;

    @Option(names = { "-o", "--output" }, description = "Output file (default: print to console)")
    File outputFile;

    @Option(names = { "--output-format" }, description = "YAML or JSON")
    String outputFormat;

    @Option(names = { "--output-encoding" }, description = "UTF8, ISO8859-1, Cp1047, ...")
    String outputEncoding;

    private FileFormat outputFileFormat;

    public static void main(String... args) {
        int exitCode = new CommandLine(new FormatConverterCli()).execute(args);
        System.exit(exitCode);
    }

    @Override
    public Integer call() {
        try {
            inputFileFormat = getFileFormat(inputFile, inputFormat);

            if (outputFile != null) {
                outputFileFormat = getFileFormat(outputFile, outputFormat);
            } else {
                // guess output file format
                if (inputFileFormat == FileFormat.YAML) {
                    outputFileFormat = FileFormat.JSON;
                } else if (inputFileFormat == FileFormat.JSON) {
                    outputFileFormat = FileFormat.YAML;
                }
            }

            Object input = loadInput();
            writeOutput(input);

            return 0;
        } catch (Exception e) {
            logger.error(e.getMessage());
            return 1;
        }
    }

    private FileFormat getFileFormat(File file, String format) throws FormatConverterCliException {
        String fn = file.toString();
        String formatLc = (format == null) ? "" : format.toLowerCase();
        String ext = fn.substring(fn.lastIndexOf(".") + 1).toLowerCase();
        FileFormat ff = null;

        if (formatLc.equals("yaml") || ext.equals("yaml") || ext.equals("yml")) {
            ff = FileFormat.YAML;
        } else if (formatLc.equals("json") || ext.equals("json")) {
            ff = FileFormat.JSON;
        } else {
            throw new FormatConverterCliException("Unsupported file format: " + ((format == null) ? ext : format));
        }

        return ff;
    }

    private Object loadInput() throws FormatConverterCliException {
        Object result = null;

        try (
            FileInputStream fi = new FileInputStream(inputFile);
            InputStreamReader reader = (inputEncoding == null) ? new InputStreamReader(fi)
            : new InputStreamReader(fi, inputEncoding);
        ) {
            if (inputFileFormat == FileFormat.YAML) {
                Yaml yaml = new Yaml();
                result = yaml.load(reader);
            } else if (inputFileFormat == FileFormat.JSON) {
                Gson gson = new Gson();
                result = gson.fromJson(reader, Object.class);
            }

            return result;
        } catch (UnsupportedEncodingException e) {
            throw new FormatConverterCliException("Unsupported input encoding: " + inputEncoding, e);
        } catch (IOException e) {
            throw new FormatConverterCliException("Error reading YAML file: " + e.getMessage(), e);
        }
    }


    private void writeOutput(Object data) throws FormatConverterCliException {
        try (
            OutputStream outputStream = (outputFile == null) ? System.out : new FileOutputStream(outputFile);
            OutputStreamWriter writer = (outputEncoding == null) ? new OutputStreamWriter(outputStream) : new OutputStreamWriter(outputStream, outputEncoding);
        ) {
            if (outputFileFormat == FileFormat.YAML) {
                DumperOptions options = new DumperOptions();
                options.setPrettyFlow(true);
                options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
                Yaml yaml = new Yaml(options);
                yaml.dump(data, writer);
            } else if (outputFileFormat == FileFormat.JSON) {
                Gson gson = new GsonBuilder().setPrettyPrinting().create();
                 gson.toJson(data, writer);
            }

            writer.flush();
        } catch (UnsupportedEncodingException e) {
            throw new FormatConverterCliException("Unsupported output encoding: " + outputEncoding, e);
        } catch (IOException e) {
            throw new FormatConverterCliException("Error opening output file: " + e.getMessage(), e);
        }
    }
}
