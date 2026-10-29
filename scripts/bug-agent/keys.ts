// Bug agent, step 1 (docs/61): a key pair for this run only. The private key
// stays in the agent's scratch folder; the public key is printed for the
// Bug queue workflow's `pubkey` input. Usage: npx tsx scripts/bug-agent/keys.ts <dir>
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { newRunKeys } from "../../lib/bug-queue";

const dir = process.argv[2];
if (!dir) throw new Error("Usage: keys.ts <scratch dir outside the repository>");
mkdirSync(dir, { recursive: true });
const { publicKey, privateKey } = newRunKeys();
writeFileSync(path.join(dir, "run-key.pem"), privateKey, { mode: 0o600 });
writeFileSync(path.join(dir, "run-key.pub"), publicKey);
console.log(publicKey);
