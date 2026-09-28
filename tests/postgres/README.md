# Postgres rehearsals

Unit tests run on PGlite, which serialises transactions, so they cannot prove
row locking. The files here run against a disposable PostgreSQL given by
`DATABASE_URL` (never production) and are not part of `npm test`:

```
DATABASE_URL=postgres://sawwiq@127.0.0.1:5499/populated npx vitest run --config tests/postgres/vitest.config.ts
```

`collab-ai-usage.pgtest.ts` races 50 assistant-budget reservations from two
connection pools and requires exactly the daily budget to win. It expects
`/tmp/pg-before.json` (a legacy contract id and terms hash recorded before the
collaboration migrations) and the `legacy.agency` seed from the migration
rehearsal described in docs/upgrades/collaboration-v2/DEPLOYMENT.md.
