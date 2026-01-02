import fs from "node:fs/promises";
import path from "node:path";

function extractObjectBlock(source, objectName) {
  const startToken = `${objectName}: {`;
  const startIndex = source.indexOf(startToken);
  if (startIndex === -1) {
    throw new Error(`Could not find locale block: ${startToken}`);
  }

  // Find the opening "{"
  const braceStart = source.indexOf("{", startIndex);
  if (braceStart === -1) {
    throw new Error(`Could not find opening brace for locale: ${objectName}`);
  }

  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth === 0) {
      return source.slice(braceStart + 1, i);
    }
  }

  throw new Error(`Unterminated object block for locale: ${objectName}`);
}

function parseMessageEntries(block) {
  // Matches: "some.key": "value",
  // This is intentionally simple and assumes messages are plain string literals.
  const entries = new Map();
  const re = /"([^"]+)"\s*:\s*"((?:\\.|[^"\\])*)"\s*,?/g;
  let match;
  while ((match = re.exec(block))) {
    const key = match[1];
    // Unescape minimal sequences for placeholder checking.
    const value = match[2].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
    entries.set(key, value);
  }
  return entries;
}

function extractPlaceholders(message) {
  const placeholders = new Set();
  const re = /\{([a-zA-Z0-9_]+)\}/g;
  let match;
  while ((match = re.exec(message))) placeholders.add(match[1]);
  return placeholders;
}

function diffKeys(aKeys, bKeys) {
  const missing = [];
  for (const key of aKeys) {
    if (!bKeys.has(key)) missing.push(key);
  }
  missing.sort();
  return missing;
}

async function main() {
  const repoRoot = process.cwd();
  const messagesPath = path.join(repoRoot, "src/i18n/messages.ts");
  const source = await fs.readFile(messagesPath, "utf8");

  const enBlock = extractObjectBlock(source, "en");
  const esBlock = extractObjectBlock(source, "es");

  const en = parseMessageEntries(enBlock);
  const es = parseMessageEntries(esBlock);

  const enKeys = new Set(en.keys());
  const esKeys = new Set(es.keys());

  const missingInEs = diffKeys(enKeys, esKeys);
  const missingInEn = diffKeys(esKeys, enKeys);

  const placeholderMismatches = [];
  for (const key of enKeys) {
    if (!es.has(key)) continue;
    const enPlaceholders = extractPlaceholders(en.get(key));
    const esPlaceholders = extractPlaceholders(es.get(key));

    const missingPlaceholders = diffKeys(enPlaceholders, esPlaceholders);
    const extraPlaceholders = diffKeys(esPlaceholders, enPlaceholders);

    if (missingPlaceholders.length || extraPlaceholders.length) {
      placeholderMismatches.push({
        key,
        missingPlaceholders,
        extraPlaceholders,
      });
    }
  }

  const problems = [];
  if (missingInEs.length) problems.push({ type: "missing-in-es", keys: missingInEs });
  if (missingInEn.length) problems.push({ type: "missing-in-en", keys: missingInEn });
  if (placeholderMismatches.length) problems.push({ type: "placeholder-mismatch", items: placeholderMismatches });

  if (!problems.length) {
    process.stdout.write(`OK: i18n keys and placeholders match (en: ${en.size}, es: ${es.size}).\n`);
    return;
  }

  for (const problem of problems) {
    if (problem.type === "missing-in-es") {
      process.stderr.write(`Missing keys in es (${problem.keys.length}):\n`);
      for (const key of problem.keys) process.stderr.write(`  - ${key}\n`);
    } else if (problem.type === "missing-in-en") {
      process.stderr.write(`Missing keys in en (${problem.keys.length}):\n`);
      for (const key of problem.keys) process.stderr.write(`  - ${key}\n`);
    } else if (problem.type === "placeholder-mismatch") {
      process.stderr.write(`Placeholder mismatches (${problem.items.length}):\n`);
      for (const item of problem.items) {
        process.stderr.write(`  - ${item.key}\n`);
        if (item.missingPlaceholders.length) {
          process.stderr.write(`    missing in es: ${item.missingPlaceholders.join(", ")}\n`);
        }
        if (item.extraPlaceholders.length) {
          process.stderr.write(`    extra in es: ${item.extraPlaceholders.join(", ")}\n`);
        }
      }
    }
  }

  process.exitCode = 1;
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});

