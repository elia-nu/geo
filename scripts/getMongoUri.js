import fs from "fs";
import path from "path";

/**
 * Resolves the MongoDB connection string for local Linux VPS or remote environment.
 * Order of priority:
 * 1. process.env.MONGODB_URI
 * 2. .env.local, .env.production, or .env files in project root
 * 3. Default local MongoDB on Linux VPS: mongodb://127.0.0.1:27017/geo
 */
export function getMongoUri() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const envFiles = [".env.local", ".env.production", ".env"];
  for (const envFile of envFiles) {
    const filePath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf8");
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (trimmed.startsWith("MONGODB_URI=")) {
            const val = trimmed.slice("MONGODB_URI=".length).trim().replace(/^["']|["']$/g, "");
            if (val) {
              return val;
            }
          }
        }
      } catch (_) {}
    }
  }

  // Standard local MongoDB instance running on Linux VPS (127.0.0.1 ensures IPv4 binding)
  return "mongodb://127.0.0.1:27017/geo";
}

export default getMongoUri;
