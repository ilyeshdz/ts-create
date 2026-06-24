import { file } from "ts-treegen";
import type { PlateNode } from "ts-treegen";
import type { PackageJsonConfig, DepItem } from "../types.js";

const REGISTRY_CACHE = new Map<string, string>();

async function fetchLatestVersion(name: string): Promise<string> {
  const cached = REGISTRY_CACHE.get(name);
  if (cached) return cached;

  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`);
    if (!res.ok) return "*";
    const data = (await res.json()) as { version: string };
    const version = `^${data.version}`;
    REGISTRY_CACHE.set(name, version);
    return version;
  } catch {
    return "*";
  }
}

async function resolveDeps(deps: DepItem[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    deps.map(async (dep): Promise<[string, string]> => {
      if (typeof dep === "string") {
        return [dep, await fetchLatestVersion(dep)];
      }
      const version = dep.version ?? (await fetchLatestVersion(dep.name));
      return [dep.name, version];
    }),
  );
  return Object.fromEntries(entries);
}

export function packageJson(config: PackageJsonConfig): PlateNode {
  const { dependencies, devDependencies, peerDependencies, optionalDependencies, ...rest } = config;

  return file("package.json", async (): Promise<string> => {
    const pkg: Record<string, unknown> = { ...rest };

    if (dependencies && dependencies.length > 0) {
      pkg.dependencies = await resolveDeps(dependencies);
    }
    if (devDependencies && devDependencies.length > 0) {
      pkg.devDependencies = await resolveDeps(devDependencies);
    }
    if (peerDependencies && peerDependencies.length > 0) {
      pkg.peerDependencies = await resolveDeps(peerDependencies);
    }
    if (optionalDependencies && optionalDependencies.length > 0) {
      pkg.optionalDependencies = await resolveDeps(optionalDependencies);
    }

    return JSON.stringify(pkg, null, 2);
  });
}
