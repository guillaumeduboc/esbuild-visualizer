import { version } from "./version";

import type { TemplateType } from "./template-types";
import { ModuleMapper } from "./module-mapper";
import { addLinks, buildTree, mergeTrees } from "./data";
import { renderTemplate } from "./render-template";
import type { ModuleLengths, ModuleTree, ModuleTreeLeaf, VisualizerData } from "../types/types";
import type { Metadata, MetadataOutput } from "../types/metafile";
import type { ModuleInfo } from "../types/rollup";

export { TemplateType, Metadata };

export interface PluginVisualizerOptions {
  /**
   * HTML <title> value in generated file. Ignored when `json` is true.
   *
   * @default "Rollup Visualizer"
   */
  title?: string;


  /**
   * Which diagram to generate. 'sunburst' or 'treemap' can help find big dependencies or if they are repeated.
   * 'network' can answer you why something was included
   *
   * @default 'treemap'
   */
  template?: TemplateType;
}

export const visualizer = async (metadata: Metadata, opts: PluginVisualizerOptions = {}): Promise<string> => {
  const title = opts.title ?? "EsBuild Visualizer";

  const template = opts.template ?? "treemap";
  const projectRoot = "";

  const renderedModuleToInfo = (id: string, mod: { bytesInOutput: number }): ModuleLengths & { id: string } => {
    const result = {
      id,
      gzipLength: 0,
      brotliLength: 0,
      renderedLength: mod.bytesInOutput,
    };
    return result;
  };

  const roots: Array<ModuleTree | ModuleTreeLeaf> = [];
  const mapper = new ModuleMapper(projectRoot);

  // collect trees
  for (const [bundleId, bundle] of Object.entries(metadata.outputs)) {
    const modules = Object.entries(bundle.inputs).map(([id, mod]) => renderedModuleToInfo(id, mod));

    const tree = buildTree(bundleId, modules, mapper);

    roots.push(tree);
  }

  const getModuleInfo =
    (bundle: MetadataOutput) =>
    (moduleId: string): ModuleInfo => {
      const input = metadata.inputs?.[moduleId];

      const imports = input?.imports.map((i) => i.path);

      return {
        renderedLength: bundle.inputs?.[moduleId]?.bytesInOutput ?? 0,
        importedIds: imports ?? [],
        dynamicallyImportedIds: [],
        isEntry: bundle.entryPoint === moduleId,
        isExternal: false,
      };
    };

  for (const [, bundle] of Object.entries(metadata.outputs)) {
    if (bundle.entryPoint == null) continue;

    addLinks(bundle.entryPoint, getModuleInfo(bundle), mapper);
  }

  const tree = mergeTrees(roots);

  const data: VisualizerData = {
    version,
    tree,
    nodeParts: mapper.getNodeParts(),
    nodeMetas: mapper.getNodeMetas(),
    env: {
    },
    options: {
      gzip: false,
      brotli: false,
      sourcemap: false,
    },
  };

  const fileContent: string = await renderTemplate(template, {
    title,
    data,
  });

  return fileContent;
};
