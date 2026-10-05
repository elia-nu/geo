import fs from "fs";
import path from "path";

function parseEnvValue(raw) {
  return raw.trim().replace(/^["']|["']$/g, "");
}

/**
 * Loads KEY=VALUE pairs from .env files into process.env without overwriting
 * variables that are already set in the environment.
 */
export function loadEnv() {
  const envFiles = [".env", ".env.local", ".env.development", ".env.production"];
  for (const envFile of envFiles) {
    const filePath = path.resolve(process.cwd(), envFile);
    if (!fs.existsSync(filePath)) continue;
    try {
      const content = fs.readFileSync(filePath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = parseEnvValue(trimmed.slice(eq + 1));
        if (key && process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    } catch (_) {}
  }
}

loadEnv();

/**
 * Resolves the MongoDB connection string.
 * Order of priority:
 * 1. process.env.MONGODB_URI (including values loaded from .env)
 * 2. Default local MongoDB: mongodb://127.0.0.1:27017/geo
 */
export function getMongoUri() {
  loadEnv();
  return process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/geo";
}

export default getMongoUri;
