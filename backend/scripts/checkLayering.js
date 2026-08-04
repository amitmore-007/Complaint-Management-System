/**
 * Enforces the layering rule:
 *
 *   route -> controller (HTTP only) -> service (business rules)
 *         -> data (all DB access)   -> model
 *
 * Only files under data/ (plus the migration scripts, which are one-off tools)
 * may import from models/. Controllers may not import data/ directly either —
 * they go through a service.
 *
 * Usage: npm run check:layers
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const walk = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
};

const rel = (f) => path.relative(backendDir, f).split(path.sep).join("/");

const RULES = [
  {
    name: "only data/ may import models/",
    applies: (f) =>
      !f.startsWith("data/") &&
      !f.startsWith("scripts/") &&
      !f.startsWith("models/"),
    forbid: /from\s+["'][^"']*\/models\/[^"']+["']/,
  },
  {
    name: "controllers must not reach past services into data/",
    applies: (f) => f.startsWith("controllers/"),
    forbid: /from\s+["'][^"']*\/data\/[^"']+["']/,
  },
  {
    name: "data/ must not import services/",
    applies: (f) => f.startsWith("data/"),
    forbid: /from\s+["'][^"']*\/services\/[^"']+["']/,
  },
];

const violations = [];

for (const file of walk(backendDir)) {
  const name = rel(file);
  const source = fs.readFileSync(file, "utf8");

  for (const rule of RULES) {
    if (!rule.applies(name)) continue;

    for (const [i, line] of source.split("\n").entries()) {
      if (rule.forbid.test(line)) {
        violations.push({ file: name, line: i + 1, rule: rule.name, code: line.trim() });
      }
    }
  }
}

if (violations.length === 0) {
  console.log("✅ Layering rules hold.");
  process.exit(0);
}

console.error(`❌ ${violations.length} layering violation(s):\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}`);
  console.error(`    rule: ${v.rule}`);
  console.error(`    ${v.code}\n`);
}
process.exit(1);
