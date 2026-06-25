import { readFile, readdir } from "node:fs/promises";
import { join, resolve, basename, relative } from "node:path";

const LOCKFILES = new Set([
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
  "bun.lock",
  "bun.lockb",
  "deno.lock",
]);

interface IgnoreRule {
  pattern: string;
  negate: boolean;
  dirOnly: boolean;
  rootRelative: boolean;
}

interface FileEntry {
  type: "file";
  name: string;
  relPath: string;
  content: string;
}

interface DirEntry {
  type: "dir";
  name: string;
  children: TreeNode[];
}

type TreeNode = FileEntry | DirEntry;

function globMatch(str: string, glob: string): boolean {
  let regexStr = "^";
  let i = 0;

  while (i < glob.length) {
    const ch = glob[i];
    if (ch === "*" && i + 1 < glob.length && glob[i + 1] === "*") {
      regexStr += ".*";
      i += 2;
      if (i < glob.length && glob[i] === "/") i++;
    } else if (ch === "*") {
      regexStr += "[^/]*";
      i++;
    } else if (ch === "?") {
      regexStr += "[^/]";
      i++;
    } else if (ch === ".") {
      regexStr += "\\.";
      i++;
    } else if ("+^${}()|\\".includes(ch)) {
      regexStr += "\\" + ch;
      i++;
    } else {
      regexStr += ch;
      i++;
    }
  }

  regexStr += "$";

  try {
    return new RegExp(regexStr).test(str);
  } catch {
    return false;
  }
}

function parseGitignore(content: string): IgnoreRule[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const negate = line.startsWith("!");
      const raw = negate ? line.slice(1) : line;
      const dirOnly = raw.endsWith("/");
      const rootRelative = raw.startsWith("/");
      const pattern = dirOnly || rootRelative ? raw.replace(/^\/|\/$/g, "") : raw;
      return { pattern, negate, dirOnly, rootRelative };
    });
}

function isIgnored(relativePath: string, rules: IgnoreRule[]): boolean {
  let ignored = false;

  for (const rule of rules) {
    let matches = false;

    if (rule.rootRelative) {
      matches = globMatch(relativePath, rule.pattern);
    } else if (rule.pattern.includes("/")) {
      matches =
        globMatch(relativePath, rule.pattern) || globMatch(relativePath, `**/${rule.pattern}`);
    } else {
      const segments = relativePath.split("/");
      matches = segments.some((s) => globMatch(s, rule.pattern));
    }

    if (matches) {
      ignored = !rule.negate;
    }
  }

  return ignored;
}

async function loadIgnoreRules(sourcePath: string): Promise<IgnoreRule[]> {
  try {
    const gitignorePath = join(sourcePath, ".gitignore");
    const content = await readFile(gitignorePath, "utf-8");
    return parseGitignore(content);
  } catch {
    return [];
  }
}

async function walkDirectory(
  dirPath: string,
  sourcePath: string,
  rules: IgnoreRule[],
): Promise<TreeNode[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const results: TreeNode[] = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isSymbolicLink()) continue;
    if (entry.name.startsWith(".")) continue;

    const relPath = relative(sourcePath, fullPath);

    if (isIgnored(relPath, rules)) continue;

    if (entry.isDirectory()) {
      const children = await walkDirectory(fullPath, sourcePath, rules);
      results.push({ type: "dir", name: entry.name, children });
    } else if (entry.isFile()) {
      if (LOCKFILES.has(entry.name)) continue;
      const buffer = await readFile(fullPath);
      const content = buffer.toString("utf-8");
      results.push({ type: "file", name: entry.name, relPath, content });
    }
  }

  results.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return results;
}

function escapeContent(content: string): string {
  const escaped = content.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return `\`${escaped}\``;
}

function renderDepList(deps: Record<string, string>, indent: number): string {
  const pad = "  ".repeat(indent);
  const inner = "  ".repeat(indent + 1);
  const items = Object.entries(deps).map(([name, version]) => {
    if (version === "*" || version === "latest") {
      return `${inner}${JSON.stringify(name)}`;
    }
    return `${inner}${JSON.stringify({ name, version })}`;
  });
  if (items.length === 0) return "[]";
  return `[\n${items.join(",\n")},\n${pad}]`;
}

function renderInCode(value: unknown, indent: number): string {
  const pad = "  ".repeat(indent);

  if (value === null || value === undefined) return `${pad}undefined`;
  if (typeof value === "string") return `${pad}${JSON.stringify(value)}`;
  if (typeof value === "number" || typeof value === "boolean") return `${pad}${String(value)}`;
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    const items = value.map((v) => renderInCode(v, indent + 1).trimStart());
    return `${pad}[\n${items.join(",\n")},\n${pad}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([_, v]) => v !== undefined,
    );
    if (entries.length === 0) return `${pad}{}`;
    const rendered = entries.map(([k, v]) => {
      const val = renderInCode(v, indent + 1).trimStart();
      return `${pad}  ${JSON.stringify(k)}: ${val}`;
    });
    return `${pad}{\n${rendered.join(",\n")},\n${pad}}`;
  }
  return `${pad}${String(value)}`;
}

function renderPackageJsonNode(content: string, indent: number): string {
  const pad = "  ".repeat(indent);
  try {
    const pkg = JSON.parse(content) as Record<string, unknown>;

    const knownFields = [
      "name",
      "version",
      "description",
      "type",
      "private",
      "license",
      "author",
      "main",
      "scripts",
    ];
    const depFields = [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ];

    const configLines: string[] = [];

    for (const field of knownFields) {
      if (pkg[field] !== undefined) {
        configLines.push(`${pad}  ${field}: ${JSON.stringify(pkg[field])}`);
      }
    }

    const extraFields = Object.keys(pkg).filter(
      (k) => !knownFields.includes(k) && !depFields.includes(k) && k !== "packageJson",
    );
    for (const field of extraFields) {
      configLines.push(`${pad}  ${field}: ${renderInCode(pkg[field], indent + 1).trimStart()}`);
    }

    for (const depField of depFields) {
      const deps = pkg[depField];
      if (deps && typeof deps === "object" && !Array.isArray(deps)) {
        const rendered = renderDepList(deps as Record<string, string>, indent + 1);
        configLines.push(`${pad}  ${depField}: ${rendered.trimStart()}`);
      }
    }

    if (configLines.length === 0) {
      return `${pad}packageJson({})`;
    }

    return `${pad}packageJson({\n${configLines.join(",\n")},\n${pad}})`;
  } catch {
    return `${pad}file(${JSON.stringify("package.json")}, ${escapeContent(content)})`;
  }
}

function toContentVarName(relPath: string): string {
  return "_" + relPath.replace(/[^a-zA-Z0-9]/g, "_");
}

function toContentFileName(relPath: string): string {
  return relPath
    .replace(/\//g, "_")
    .replace(/^\./, "_dot_")
    .replace(/\.[^.]*$/, ".ts");
}

function toContentImportPath(relPath: string): string {
  const fileName = toContentFileName(relPath);
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  return `./_contents/${base}.js`;
}

interface ExternalContent {
  varName: string;
  content: string;
}

function collectExternalContents(nodes: TreeNode[]): Map<string, ExternalContent> {
  const map = new Map<string, ExternalContent>();
  for (const node of nodes) {
    if (node.type === "file") {
      if (node.name !== "package.json" && node.content) {
        const varName = toContentVarName(node.relPath);
        map.set(node.relPath, { varName, content: node.content });
      }
    } else {
      for (const [k, v] of collectExternalContents(node.children)) map.set(k, v);
    }
  }
  return map;
}

function renderNode(
  node: TreeNode,
  indent: number,
  externalContents: Map<string, ExternalContent>,
): string {
  const pad = "  ".repeat(indent);

  if (node.type === "file") {
    if (node.name === "package.json") {
      return renderPackageJsonNode(node.content, indent);
    }
    const external = externalContents.get(node.relPath);
    if (external) {
      return `${pad}file(${JSON.stringify(node.name)}, ${external.varName})`;
    }
    return `${pad}file(${JSON.stringify(node.name)})`;
  }

  if (node.children.length === 0) {
    return `${pad}dir(${JSON.stringify(node.name)})`;
  }

  const children = node.children
    .map((c) => renderNode(c, indent + 1, externalContents))
    .join(",\n");
  return `${pad}dir(${JSON.stringify(node.name)},\n${children},\n${pad})`;
}

export interface CompiledFile {
  path: string;
  content: string;
}

export interface CompileResult {
  sourceName: string;
  totalFiles: number;
  files: CompiledFile[];
}

export async function compileFolder(sourcePath: string): Promise<CompileResult> {
  const resolvedPath = resolve(sourcePath);
  const folderName = basename(resolvedPath);
  const rules = await loadIgnoreRules(resolvedPath);

  const tree = await walkDirectory(resolvedPath, resolvedPath, rules);
  const totalFiles = countFiles(tree);

  const externalContents = collectExternalContents(tree);
  const hasPackageJson = tree.some((n) => n.type === "file" && n.name === "package.json");

  const importLines: string[] = [];
  let generatorImports = "generator";
  if (hasPackageJson) generatorImports += ", packageJson";

  for (const [relPath, ext] of externalContents) {
    importLines.push(`import ${ext.varName} from "${toContentImportPath(relPath)}"`);
  }

  importLines.push(`import { ${generatorImports} } from "ts-create"`);
  importLines.push(`import { file, dir } from "ts-treegen"`);

  const imports = importLines.join(";\n") + ";\n";

  const body = renderNode({ type: "dir", name: folderName, children: tree }, 2, externalContents);

  const contentFiles: CompiledFile[] = [];
  for (const [relPath, ext] of externalContents) {
    contentFiles.push({
      path: `_contents/${toContentFileName(relPath)}`,
      content: `export default ${escapeContent(ext.content)};\n`,
    });
  }

  const isMultiFile = tree.length > 1 || (tree.length === 1 && tree[0]!.type === "dir");

  let mainCode: string;

  if (!isMultiFile && tree.length === 1 && tree[0]!.type === "file") {
    const singleFile = tree[0] as FileEntry;
    const external =
      singleFile.name !== "package.json" ? externalContents.get(singleFile.relPath) : undefined;
    const singleBody =
      singleFile.name === "package.json"
        ? renderPackageJsonNode(singleFile.content, 2)
        : external
          ? `${"  ".repeat(2)}file(${JSON.stringify(folderName + "/" + singleFile.name)}, ${external.varName})`
          : `${"  ".repeat(2)}file(${JSON.stringify(folderName + "/" + singleFile.name)})`;

    mainCode = `${imports}
export default generator({ name: ${JSON.stringify(folderName)} })
  .render(({ answers }) => [
${singleBody},
  ]);
`;
  } else {
    mainCode = `${imports}
export default generator({ name: ${JSON.stringify(folderName)} })
  .render(({ answers }) => [
${body},
  ]);
`;
  }

  const files: CompiledFile[] = [{ path: "generator.ts", content: mainCode }, ...contentFiles];

  return { sourceName: folderName, totalFiles, files };
}

function countFiles(tree: TreeNode[]): number {
  let count = 0;
  for (const node of tree) {
    if (node.type === "file") count++;
    else count += countFiles(node.children);
  }
  return count;
}
