#!/usr/bin/env python3
"""Generate THIRD_PARTY_NOTICES.md from go-licenses (Go) and license-checker (npm) reports.

Usage:
    go install github.com/google/go-licenses@latest
    python3 scripts/generate_third_party_notices.py

Requires `npm ci` to have populated node_modules/ (npm report is production deps only).
"""
import csv
import io
import json
import os
import subprocess
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODULE = "github.com/altinity/clickhouse-grafana"

GO_CMD = ["go-licenses", "report", "./pkg", "--ignore", MODULE]
NPM_CMD = ["npx", "--yes", "license-checker-rseidelsohn", "--production",
           "--json", "--excludePrivatePackages"]


def run(cmd):
    res = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if res.returncode != 0:
        sys.stderr.write(res.stderr)
        sys.exit(f"command failed: {' '.join(cmd)}")
    return res.stdout


def go_packages():
    rows = {}
    for pkg, url, lic in csv.reader(io.StringIO(run(GO_CMD))):
        rows.setdefault(pkg, {"url": url, "licenses": []})
        if lic not in rows[pkg]["licenses"]:
            rows[pkg]["licenses"].append(lic)
    return [(pkg, " AND ".join(v["licenses"]), v["url"]) for pkg, v in rows.items()]


def npm_packages():
    data = json.loads(run(NPM_CMD))
    out = []
    for name_ver, meta in data.items():
        name, _, ver = name_ver.rpartition("@")
        lic = meta.get("licenses", "UNKNOWN")
        repo = meta.get("repository") or f"https://www.npmjs.com/package/{name}"
        lic_file = meta.get("licenseFile", "")
        lic_file = os.path.relpath(lic_file, ROOT) if lic_file else ""
        out.append((name, ver, lic, repo, lic_file))
    return out


def summary_table(licenses):
    counts = Counter(licenses)
    lines = ["| License | Packages |", "|---------|----------|"]
    for lic, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
        lines.append(f"| {lic} | {n} |")
    lines.append(f"\n**Total packages:** {len(licenses)}")
    return "\n".join(lines)


def main():
    go_rows = sorted(go_packages(), key=lambda r: r[0].lower())
    npm_rows = sorted(npm_packages(), key=lambda r: (r[0].lower(), r[1]))

    md = []
    md.append("# Third-Party License Attribution\n")
    md.append("This file lists third-party dependencies shipped with the "
              "`vertamedia-clickhouse-datasource` Grafana plugin, with their SPDX license identifiers.\n")
    md.append("The plugin consists of two parts, so two separate tools are used:\n")
    md.append("- **Go backend** (`pkg/`, built into the `clickhouse-plugin_*` binaries) — "
              "reported with [`go-licenses`](https://github.com/google/go-licenses).")
    md.append("- **TypeScript frontend** (`src/`, bundled by webpack into `dist/module.js`) — "
              "reported with [`license-checker-rseidelsohn`](https://github.com/RSeidelsohn/license-checker-rseidelsohn) "
              "over production dependencies from `package.json` (devDependencies are build-time only and are not shipped).\n")
    md.append("Regenerate with:\n")
    md.append("```bash\ngo install github.com/google/go-licenses@latest\nnpm ci\n"
              "python3 scripts/generate_third_party_notices.py\n```\n")
    md.append("The main project license is MIT; see [`LICENSE`](LICENSE).\n")
    md.append("> Note: `@grafana/data`, `@grafana/runtime`, `@grafana/ui`, `react`, `react-dom`, `rxjs`, "
              "`lodash`, `moment` and a few other packages are declared as webpack externals and are "
              "provided at runtime by Grafana itself rather than bundled into the plugin. They are still "
              "listed below for completeness.\n")

    md.append("## Go backend\n")
    md.append("### Summary\n")
    md.append(summary_table([r[1] for r in go_rows]) + "\n")
    md.append("### Packages\n")
    md.append("| Package | License | License file |")
    md.append("|---------|---------|--------------|")
    for pkg, lic, url in go_rows:
        fname = url.rstrip("/").rsplit("/", 1)[-1]
        md.append(f"| `{pkg}` | {lic} | [`{fname}`]({url}) |")
    md.append("")

    md.append("## TypeScript frontend (npm)\n")
    md.append("### Summary\n")
    md.append(summary_table([r[2] for r in npm_rows]) + "\n")
    md.append("### Packages\n")
    md.append("| Package | Version | License | Repository | License file |")
    md.append("|---------|---------|---------|------------|--------------|")
    for name, ver, lic, repo, lic_file in npm_rows:
        lf = f"`{lic_file}`" if lic_file else "—"
        md.append(f"| `{name}` | {ver} | {lic} | {repo} | {lf} |")
    md.append("")

    unknown = [r for r in npm_rows if r[2] == "UNKNOWN"]
    if unknown:
        md.append("### Packages without a declared license\n")
        for name, ver, _, repo, _ in unknown:
            md.append(f"- `{name}@{ver}` ({repo}) — no `license` field in `package.json` and no LICENSE file; "
                      "pulled in transitively.")
        md.append("")

    with open(os.path.join(ROOT, "THIRD_PARTY_NOTICES.md"), "w") as f:
        f.write("\n".join(md))
    print(f"Go packages: {len(go_rows)}, npm packages: {len(npm_rows)}")


if __name__ == "__main__":
    main()
