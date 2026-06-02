# Viewing the Database

Two commands, two jobs. Both read **live from Neon** (whatever `DATABASE_URL` points
at in `.env.local`).

## `npm run db:diagram` — live visual ER diagram (the node view)

A node-based diagram: a card per table with foreign-key lines between them, with
zoom/pan, dragging, and click-to-focus. Fully self-contained — **no third-party service,
no account, no paywall.** We render it ourselves.

```bash
npm run db:diagram     # starts a local server; Ctrl+C to stop
```

What it does:
1. Reads `DATABASE_URL` from `.env.local`.
2. Starts a tiny **local server** on `http://localhost:4985` (binds to `127.0.0.1` only).
3. Opens it in your browser. The startup log prints the host it connected to.

The page is **live**: on every load — and on the **⟳ Refresh** button — it asks the
server for the current schema, which runs the **read-only** introspection query in
[`scripts/db-introspect.sql`](../scripts/db-introspect.sql) against Neon (schema metadata
only — table / column / FK / index names, **never rows**). So if you add a column or
table directly in Neon, just hit ⟳ Refresh and it appears, connections and all.

> Your DB credentials stay in the Node process — the browser only ever talks to
> `localhost`. The page itself is [`scripts/db-diagram.template.html`](../scripts/db-diagram.template.html)
> (a [React Flow](https://reactflow.dev) page served by the local server).

In the diagram:
- **Drag** tables to rearrange · **scroll / pinch** to zoom · use the minimap to navigate.
- **Bottom toolbar**: zoom in/out, fit-to-view, **✨ Auto layout** (re-tidies the whole
  graph using the [ELK](https://eclipse.dev/elk/) layered engine, handy after dragging),
  and **⟳ Refresh** (re-queries the live Neon schema without restarting the command).
- **Foreign keys connect at the column level**: each line leaves the exact FK column
  (green dot, right) and lands on the exact referenced column (purple dot, left), labeled
  `column → column`.
- **Click a table** to focus it — connected tables stay lit, the rest dim. Click the
  background to clear.
- **Schema dropdown** (top-left) filters by schema. Defaults to `(all)` so every
  connection in the DB is visible; narrow to `public` or `neon_auth` as needed.
- 🔑 = primary key, 🔗 = foreign key.

Use **⟳ Refresh** to pull the latest schema without restarting — no need to re-run the command.

> Flags: `npm run db:diagram -- --no-open` skips launching the browser (the server still runs).
>
> The page loads React Flow / ELK from a CDN (esm.sh), so it needs an internet connection.

## `npm run db:studio` — data browser (Drizzle Studio)

A spreadsheet-style browser for **rows** — view and edit actual data, run queries. This
is *not* a diagram; it's a table/data explorer (similar feel to the Neon console).

```bash
npm run db:studio
```

Opens **https://local.drizzle.studio** (local server on port `4983`), using the same
`DATABASE_URL` via [`drizzle.config.ts`](../drizzle.config.ts).

## ⚠️ Note on the connection

Both commands point at whatever `DATABASE_URL` is in `.env.local` — a **real Neon
database**. `db:diagram` is read-only. `db:studio` *can edit rows*, so be careful there.

## Schema source of truth

The schema is defined in code at [`src/db/schema.ts`](../src/db/schema.ts) (Drizzle ORM).
These tools introspect the **live database**, so if the two ever drift, the tools show
what's actually deployed.
