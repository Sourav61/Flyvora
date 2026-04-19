const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const loadEnvFile = (filename) => {
  const envPath = path.join(__dirname, "..", filename);

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
};

const nodeEnv = process.env.NODE_ENV || "development";

[
  `.env.${nodeEnv}.local`,
  ".env.local",
  `.env.${nodeEnv}`,
  ".env",
].forEach(loadEnvFile);

const normalizeApiBaseUrl = (value = "") => String(value).trim().replace(/\/$/, "");

const apiBaseUrl = normalizeApiBaseUrl(
  process.env.RUNTIME_API_BASE_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    process.env.API_BASE_URL ||
    ""
);

const outputPath = path.join(__dirname, "..", "public", "runtime-config.js");
const fileContents = `// Optional runtime override for deployed environments.
// This file is generated during start/build from env vars.
window.__FLYVORA_CONFIG__ = Object.assign({}, window.__FLYVORA_CONFIG__, ${JSON.stringify({
  apiBaseUrl,
})});
`;

fs.writeFileSync(outputPath, fileContents, "utf8");
console.log(`Generated runtime config at ${outputPath} with apiBaseUrl=${apiBaseUrl || "(empty)"}`);
