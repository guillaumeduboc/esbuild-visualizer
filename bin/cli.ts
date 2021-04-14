#!/usr/bin/env node

import { promises as fs } from "fs";

import globToRegexp from "glob-to-regexp";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import TEMPLATE, { TemplateType } from "../plugin/template-types";
import { warn } from "../plugin/warn";
import { Metadata } from "../types/metafile";
import { visualizer} from '../plugin/index'

const argv = yargs(hideBin(process.argv))
  .option("filename", {
    describe: "Output file name",
    type: "string",
    default: "./stats.html",
  })
  .option("title", {
    describe: "Output file title",
    type: "string",
    default: "RollUp Visualizer",
  })
  .option("template", {
    describe: "Template type",
    type: "string",
    choices: TEMPLATE,
    default: "treemap" as TemplateType,
  })
  .option("metadata", {
    describe: "Input file name",
    string: true,
    default: "./metadata.json",
  })
  .option("include", {
    array: true,
    default: [],
    describe: "Include patterns",
  })
  .option("exclude", {
    array: true,
    default: [],
    describe: "Exclude patterns",
  })
  .help().argv;

interface CliArgs {
  filename: string;
  title: string;
  template: TemplateType;
  include: string[];
  exclude: string[];
  metadata: string;
}

const run = async (args: CliArgs) => {
  const textContent = await fs.readFile(args.metadata, { encoding: "utf-8" });
  const jsonContent = JSON.parse(textContent) as Metadata;

  await visualizer(jsonContent, {
    title: args.title,
    template: args.template,
    filename: args.filename,
    include: args.include.map((p) => globToRegexp(p, { extended: true })),
    exclude: args.exclude.map((p) => globToRegexp(p, { extended: true })),
  });
};

run(argv).catch((err) => {
  warn(err.stack);
  process.exit(1);
});