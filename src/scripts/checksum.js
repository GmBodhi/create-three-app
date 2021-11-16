import { readFileSync } from "fs";

const { createHash } = require("crypto");

export function generateChecksum(file) {
  const content = readFileSync(file);

  // Using sha1 for performance reasons
  const hash = createHash("sha1").update(content).digest("hex");
  return hash;
}

export function verifyChecksum(file, shasum) {
  const fileHash = generateChecksum(file);

  return shasum === fileHash;
}
