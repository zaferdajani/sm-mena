// Bug agent, replies (docs/63): seals the replies to reporters to the site's reply
// key (in queue.json) for the Bug queue workflow's `replies` input. The repository
// is public, so a reply never travels as plain text. Prints one base64 line.
// Usage: npx tsx scripts/bug-agent/seal-replies.ts <dir> <replies.json>
//   replies.json: [{"ref":"1A2B3C4D","body":"…","status":"done","commit":"abc1234"}]
import { readFileSync } from "node:fs";
import path from "node:path";
import { queueReplies, seal, type QueueBundle } from "../../lib/bug-queue";

const [dir, file] = process.argv.slice(2);
if (!dir || !file) throw new Error("Usage: seal-replies.ts <dir> <replies.json>");
const queue = JSON.parse(readFileSync(path.join(dir, "queue.json"), "utf8")) as QueueBundle;
if (!queue.replyKey) throw new Error("This queue has no reply key: export it again with the current Bug queue workflow.");
const replies = queueReplies.parse(JSON.parse(readFileSync(file, "utf8")));
process.stdout.write(Buffer.from(JSON.stringify(seal(replies, queue.replyKey))).toString("base64") + "\n");
