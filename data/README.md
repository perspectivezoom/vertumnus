# data

Where the poster's produce data comes from, and how it is made.

```
regions/<id>.ts ──┬─▶ [ fetch ] ──▶ raw/ ──┬─▶ [ build ] ──▶ regions/__generated__/<id>.ts
  crop lists      │    network              │   offline            the app imports this
                  └────────────────────────-┘
```

Two commands, one per stage:

|                   |                           |                                                         |
| ----------------- | ------------------------- | ------------------------------------------------------- |
| `bun run fetch`   | writes `raw/`             | needs `MARS_API_KEY`, resumable, `--limit=N`, `--force` |
| `bun run regions` | `raw/` → `__generated__/` | offline; this is what CI verifies                       |

## The two namespaces

Each owns its artifacts, the schema describing them, and the code that writes them.

**`raw/`** — source data as published, committed so an auth-walled API stays reproducible and
nobody has to refetch to look. Not the whole publication, though: a source narrows what it asks
for, so these hold only what some region wants (see **Reach** below).

- `format.ts` — the columnar `.jsonc` codec, i.e. what these files _are_
- `source.ts` — the one thing `fetch.ts` asks of a source: what it would fetch, and why
- `fetch.ts` — the CLI that sequences that work
- `mars/{client,reports}.ts` — USDA Market News: how to ask, and which report carries what
- `mars/ca/*.jsonc` — **the artifacts**, each recording the districts it was narrowed to

**`regions/`** — the modules the app imports, and everything that produces them.

- `crops/{sfbay,ny}.ts` — **crop lists: the source of truth** for what each poster shows
- `crops/index.ts` — the crop types and the region registry
- `sources/mars.ts` — turns a raw cache into spans and a citation
- `render.ts` — produce entries → module text
- `schema.ts` — the zod schema, i.e. what `__generated__` _is_
- `build.ts` — the CLI that writes it
- `index.ts` — what the app imports
- `__generated__/*.ts` — **the artifacts**

`crops/` says _what_ each poster shows; `sources/` says _where the data comes from_. A crop
list names a region, but the region module itself is the build output in `__generated__/`.

## Reach

Each region's crop list names the growing districts near enough to supply it. `fetch` asks for
the union across every region — caches are keyed by where produce grows, not by who reads them,
so regions share them — and `regions` narrows that to the one being built. **Widening a
region's reach therefore needs a refetch**; narrowing it is only a rebuild.

## Rules

- **Never edit `__generated__/` or `raw/`.** Both are output. Change a crop list and rebuild.
- **A crop list is comprehensive.** Hand-authored produce is declared there too (as
  `type: 'manual'`, carrying its own spans and citation), so the list is the complete statement
  of what a poster shows — which is what lets the build retire anything else.
- **Cite everything.** Derived entries get a citation naming the report, the seasons and the
  cache file; manual ones carry theirs by hand.
- `tests/generatedRegions.test.ts` rebuilds every region and compares byte for byte, so a stale
  commit fails CI. If it fails: run `bun run regions` and commit the result.
