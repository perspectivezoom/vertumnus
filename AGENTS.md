# vertumnus

A static, printable poster of what is in season at local farmers' markets, at week granularity,
distinguishing _available_ from _peak_. The printed sheet is the product; the screen is a preview.

React and TypeScript, bundled by Bun directly — no Vite, no framework. Tailwind v4, oxlint and
oxfmt, zod at the data boundaries.

## Development

```
bun ./index.html      # dev server on :3000 — run it in the background, and stop it when done
bun run build         # production build into dist/
bun run ci            # tsc, oxlint, oxfmt --check, bun test
```

## Data

Region data is generated, never hand-edited: `data/regions/__generated__` is derived from the crop
lists and the raw caches committed under `data/raw/`.

```
bun run fetch         # refetch raw sources; needs MARS_API_KEY, see .env.example
bun run regions       # rederive the region modules from the committed caches
bun run plates        # re-crop and re-encode the watercolour plates
bun run favicon       # redraw the site icon from the wordmark
```

Deriving works offline from the caches, which is what CI does. Only refetching needs a key.

## The transcript

`docs/session.jsonl` is the published session log; `data/transcript/__generated__` is derived from
it and the git history. Both are refreshed deliberately rather than on every commit, since the
derived file embeds the commit list and is stale the moment it is written.

```
bun run session       # republish the log, redacting secrets by env-var name
bun run transcript    # rebuild the browser's data from the log and the history
```

`data/transcript/curation.ts` is the one hand-written part: which commits form a topic, which
topics form a chapter, and which exchanges are worth singling out.

## Conventions

- The author runs every git command. Leave changes unstaged and say what changed.
- Never invent a source. A citation points at something real, or the claim comes out.
- Ask before installing anything.
- Most important thing first — in a file, in a type, in a list of props.
