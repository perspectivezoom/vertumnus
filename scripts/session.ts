/**
 * Refresh `docs/session.jsonl` — the transcript of the conversation that built this project.
 *
 * The transcript is the raw log Claude Code keeps, republished here so the AI page has something
 * to point at that is the actual record rather than a summary of it. It is copied rather than
 * rewritten: the value of publishing it at all is that nothing was chosen for it.
 *
 * What is dropped is the binary. Screenshots ride along as base64 twice over — once as the image
 * the model was shown, once as a mirror in the tool result — and thinking blocks carry an opaque
 * signature of comparable size. Together they are the overwhelming majority of the bytes and
 * none of the reading, so each is replaced by a marker that keeps the surrounding shape intact.
 *
 * And secrets. A transcript records what was typed, so anything pasted into the conversation is
 * in the log verbatim — the MARS key was, and reached the committed file once already before it
 * was caught by hand. That is not a thing to leave to whoever runs this next, so the redaction
 * is part of the script and the script refuses to run when it cannot perform it.
 */
import { homedir } from 'node:os';

/** Stands in for elided binary, and stays greppable so nothing looks like it went missing. */
const ELIDED = '<image elided>';

/**
 * Environment variables whose values must never appear in the published transcript.
 *
 * Named rather than pattern-matched: a secret is defined by being one, not by looking like one,
 * and a regex for "things resembling a key" would both miss these and mangle innocent text.
 */
const SECRETS = ['MARS_API_KEY'];

const OUT = 'docs/session.jsonl';

/**
 * Where Claude Code keeps this project's transcripts: one directory per working tree, named
 * for its path with the separators flattened.
 */
function transcriptDir(): string {
  return `${homedir()}/.claude/projects/${process.cwd().replaceAll('/', '-')}`;
}

/**
 * Replace the binary blobs in one log entry, in place.
 *
 * Matched on the shape that carries them rather than on a path, because the same image appears
 * at two unrelated depths. Every other long string in the log is something someone wrote or the
 * model read, and is left alone.
 */
function elide(node: unknown): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) elide(item);
    return;
  }
  const record = node as Record<string, unknown>;
  const source = record.source as { data?: unknown } | undefined;
  if (record.type === 'image' && source && typeof source.data === 'string') source.data = ELIDED;
  if (record.type === 'thinking' && typeof record.signature === 'string') record.signature = ELIDED;
  if (typeof record.base64 === 'string') record.base64 = ELIDED;
  for (const value of Object.values(record)) elide(value);
}

// Resolved before anything is read: publishing is the whole point of this script, so a missing
// secret is a reason to stop rather than a warning to print above a file someone then commits.
const redactions = SECRETS.map((name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set, so its value cannot be scrubbed from the transcript.`);
    console.error(`Re-run with it in the environment: ${name}=… bun run session`);
    process.exit(1);
  }
  return [value, `<${name} redacted>`] as const;
});

const dir = transcriptDir();
const found = [...new Bun.Glob('*.jsonl').scanSync(dir)];
// One transcript is the expected case, and this file gets published: better to stop and be told
// which to take than to guess and put a conversation in the repo that was not meant for it.
if (found.length !== 1) {
  console.error(`Expected exactly one transcript in ${dir}, found ${found.length}:`);
  for (const name of found) console.error(`  ${name}`);
  process.exit(1);
}

const lines = (await Bun.file(`${dir}/${found[0]}`).text()).split('\n').filter(Boolean);
const out: string[] = [];
for (const line of lines) {
  const entry: unknown = JSON.parse(line);
  elide(entry);
  // On the serialized entry, so a secret is caught wherever it landed — a prompt, a shell
  // command that used it, a tool result quoting either back.
  let serialized = JSON.stringify(entry);
  for (const [secret, marker] of redactions) serialized = serialized.replaceAll(secret, marker);
  out.push(serialized);
}

const text = out.join('\n') + '\n';

// The check that matters, made against the bytes about to be written rather than against the
// intent above them. Nothing is published if a secret survived the pass.
for (const [secret, marker] of redactions) {
  if (text.includes(secret)) {
    console.error(`${marker.slice(1, -10)} still present after redaction; refusing to write.`);
    process.exit(1);
  }
}

await Bun.write(OUT, text);
console.log(`${OUT}: ${out.length} entries, ${(text.length / 1024 / 1024).toFixed(1)} MB`);
for (const [, marker] of redactions) {
  console.log(`redacted ${text.split(marker).length - 1} occurrence(s) of ${marker}`);
}
