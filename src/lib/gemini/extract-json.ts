/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Robustly extracts, repairs, and parses JSON from LLM output that might contain
 * extra text, markdown fences, single/multi-line comments, single quotes, unquoted keys,
 * trailing commas, unescaped control characters, or truncated structures.
 */
export function extractJson(text: string): any {
  if (typeof text !== "string") return text;

  // 1. Direct parse attempt
  try {
    return JSON.parse(text);
  } catch {}

  // 2. Strip markdown fences if present
  let str = text.trim();
  const fenceMatch = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
    str = fenceMatch[1].trim();
  } else {
    str = str.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  }

  // 3. Find opening `{` or `[`
  const firstBrace = str.indexOf("{");
  const firstBracket = str.indexOf("[");
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else {
    startIdx = firstBrace !== -1 ? firstBrace : firstBracket;
  }

  if (startIdx === -1) {
    throw new Error("No JSON object or array found in response");
  }

  str = str.substring(startIdx);

  // Try parsing from startIdx
  try {
    return JSON.parse(str);
  } catch {}

  // 4. Try from startIdx to last matching closing brace
  const lastBrace = str.lastIndexOf("}");
  const lastBracket = str.lastIndexOf("]");
  const endIdx = Math.max(lastBrace, lastBracket);
  if (endIdx > 0) {
    const sub = str.substring(0, endIdx + 1);
    try {
      return JSON.parse(sub);
    } catch {}
  }

  // 5. Strip single-line and multi-line comments outside of string literals
  let cleaned = "";
  let inStr = false;
  let quoteChar = "";
  let esc = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const next = str[i + 1];

    if (inStr) {
      if (esc) {
        cleaned += c;
        esc = false;
      } else if (c === "\\") {
        cleaned += c;
        esc = true;
      } else if (c === quoteChar) {
        cleaned += c;
        inStr = false;
        quoteChar = "";
      } else {
        cleaned += c;
      }
      continue;
    }

    if (c === '"' || c === "'") {
      inStr = true;
      quoteChar = c;
      cleaned += c;
      continue;
    }

    if (c === "/" && next === "/") {
      while (i < str.length && str[i] !== "\n") i++;
      cleaned += "\n";
      continue;
    }

    if (c === "/" && next === "*") {
      i += 2;
      while (i < str.length && !(str[i] === "*" && str[i + 1] === "/")) i++;
      i++;
      continue;
    }

    cleaned += c;
  }

  try {
    return JSON.parse(cleaned);
  } catch {}

  // 6. State-machine pass: normalize quotes, escape unescaped controls, remove trailing commas
  let normalized = "";
  inStr = false;
  quoteChar = "";
  esc = false;
  const stack: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];

    if (inStr) {
      if (esc) {
        normalized += c;
        esc = false;
      } else if (c === "\\") {
        normalized += c;
        esc = true;
      } else if (c === quoteChar) {
        normalized += '"';
        inStr = false;
        quoteChar = "";
      } else if (c === '"') {
        normalized += '\\"';
      } else if (c === "\n") {
        normalized += "\\n";
      } else if (c === "\r") {
        // ignore
      } else if (c === "\t") {
        normalized += "\\t";
      } else {
        normalized += c;
      }
      continue;
    }

    if (c === '"' || c === "'") {
      inStr = true;
      quoteChar = c;
      normalized += '"';
      continue;
    }

    if (c === "{" || c === "[") {
      stack.push(c);
      normalized += c;
      continue;
    }

    if (c === "}" || c === "]") {
      let j = normalized.length - 1;
      while (j >= 0 && /\s/.test(normalized[j])) j--;
      if (j >= 0 && normalized[j] === ",") {
        normalized = normalized.substring(0, j) + normalized.substring(j + 1);
      }

      if (stack.length > 0) {
        const expected = stack[stack.length - 1] === "{" ? "}" : "]";
        if (c === expected) {
          stack.pop();
        }
      }
      normalized += c;
      continue;
    }

    if (c === ",") {
      let j = normalized.length - 1;
      while (j >= 0 && /\s/.test(normalized[j])) j--;
      if (j >= 0 && (normalized[j] === "{" || normalized[j] === "[" || normalized[j] === "," || normalized[j] === ":")) {
        continue;
      }
      normalized += c;
      continue;
    }

    normalized += c;
  }

  // Handle truncation
  if (inStr) normalized += '"';

  let k = normalized.length - 1;
  while (k >= 0 && /\s/.test(normalized[k])) k--;
  if (k >= 0 && normalized[k] === ":") normalized += "null";

  k = normalized.length - 1;
  while (k >= 0 && /\s/.test(normalized[k])) k--;
  if (k >= 0 && normalized[k] === ",") normalized = normalized.substring(0, k);

  // If in an object and ends with key without colon/value (e.g. `{"a": 1, "b"`), append `: null`
  if (stack.length > 0 && stack[stack.length - 1] === "{") {
    let p = normalized.length - 1;
    while (p >= 0 && /\s/.test(normalized[p])) p--;
    if (p >= 0 && normalized[p] === '"') {
      let q = p - 1;
      while (q >= 0 && normalized[q] !== '"') q--;
      if (q >= 0) {
        let beforeString = q - 1;
        while (beforeString >= 0 && /\s/.test(normalized[beforeString])) beforeString--;
        if (beforeString >= 0 && (normalized[beforeString] === "{" || normalized[beforeString] === ",")) {
          normalized += ": null";
        }
      }
    }
  }

  // Close remaining open brackets
  while (stack.length > 0) {
    const open = stack.pop();
    normalized += open === "{" ? "\n}" : "\n]";
  }

  // Final cleanup: remove trailing commas before closing braces/brackets
  normalized = normalized.replace(/,(\s*[}\]])/g, "$1");

  // Fix unquoted property names: e.g. { domain: "health" } -> { "domain": "health" }
  normalized = normalized.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_-]*)(\s*:)/g, '$1"$2"$3');

  try {
    return JSON.parse(normalized);
  } catch (e: any) {
    throw new Error(`Failed to parse extracted JSON: ${e.message || e}`);
  }
}
