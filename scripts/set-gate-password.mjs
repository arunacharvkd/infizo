import { pbkdf2Sync, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ITERATIONS = 210_000;
const words = ["amber", "basin", "cedar", "delta", "ember", "flint", "grove", "harbor", "ivory", "juniper", "kettle", "lunar", "maple", "north", "orbit", "pebble", "quartz", "river", "silver", "timber", "umber", "violet", "willow", "yellow"];

const password = process.argv[2] || `${words[randomBytes(1)[0] % words.length]}-${words[randomBytes(1)[0] % words.length]}-${words[randomBytes(1)[0] % words.length]}-${100 + (randomBytes(1)[0] % 900)}`;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
const out = `// Shop password verifier. The password itself is not stored here.
export const GATE_ITERATIONS = ${ITERATIONS};
export const GATE_SALT = "${salt.toString("hex")}";
export const GATE_HASH = "${hash.toString("hex")}";
`;
const file = join(dirname(fileURLToPath(import.meta.url)), "../src/lib/gate.ts");
writeFileSync(file, out);
console.log(password);
