import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import matter from "gray-matter";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkRehype from "remark-rehype";
import { assertCortexNode, type CortexGraph } from "../src/types/cortex";

const vault = resolve("content/vault");
const output = resolve("public/data/cortex-graph.json");
const markdown = remark().use(remarkRehype).use(rehypeStringify);

async function buildGraph() {
  const files = (await readdir(vault, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
  const graph: CortexGraph = { nodes: [], links: [] };
  const filesBySlug = new Map<string, string>();

  for (const file of files) {
    try {
      const { data, content } = matter(await readFile(file, "utf8"));
      const node = {
        ...data,
        date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date,
        html: String(await markdown.process(content)),
      };
      assertCortexNode(node);
      const existingFile = filesBySlug.get(node.slug);
      if (existingFile) throw new Error(`Duplicate slug "${node.slug}" also used by ${existingFile}`);
      filesBySlug.set(node.slug, file);
      graph.nodes.push(node);

      const targets = new Set(
        Array.from(content.matchAll(/\[\[([^\[\]\r\n]+)\]\]/g), ([, target]) => target.trim()),
      );
      for (const target of targets) graph.links.push({ source: node.slug, target });
    } catch (error) {
      throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const { source, target } of graph.links) {
    if (!filesBySlug.has(target)) {
      throw new Error(`${filesBySlug.get(source)}: Unresolved wikilink [[${target}]]`);
    }
  }

  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(graph, null, 2) + "\n", "utf8");
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
  console.log(`Wrote ${graph.nodes.length} nodes and ${graph.links.length} links to public/data/cortex-graph.json`);
}

buildGraph().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
