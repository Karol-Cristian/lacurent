# Deployment Environments

LaCurent now treats development and production as separate deployment targets.

## Environments

| Environment | Worker name | URL | D1 database | Deploy command |
| --- | --- | --- | --- | --- |
| Development | `lacurent-dev` | `https://lacurent-dev.lemnarukarol.workers.dev` | `lacurent-dev-db` | `npm.cmd run deploy:dev` |
| Production | `lacurent` | `https://lacurent.lemnarukarol.workers.dev` | `lacurent-db` | `npm.cmd run deploy:prod` with confirmation |

## Safety Rule

Running plain `wrangler deploy` now targets `lacurent-dev`, not production.
For less ambiguity, use the explicit npm script:

```powershell
npm.cmd run deploy:dev
```

Production deploys must be explicit:

```powershell
npm.cmd run smoke
$env:CONFIRM_PRODUCTION_DEPLOY="lacurent-production"
npm.cmd run deploy:prod
Remove-Item Env:\CONFIRM_PRODUCTION_DEPLOY
```

The `deploy:prod` script is blocked unless `CONFIRM_PRODUCTION_DEPLOY` is set to the exact expected value.

## First Development Setup

Create a separate development D1 database:

```powershell
npm.cmd run d1:dev:create
```

Copy the returned `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "lacurent-dev-db"
database_id = "PASTE_DEV_DB_ID_HERE"
```

Initialize the development schema:

```powershell
npm.cmd run d1:dev:schema
```

Then deploy development:

```powershell
npm.cmd run deploy:dev:dry-run
npm.cmd run deploy:dev
```

## Local Development

Use local worker development:

```powershell
npm.cmd run dev:worker
```

The browser API helper uses:

1. `window.LA_CURENT_API_BASE`, if explicitly set;
2. same-origin API for deployed workers;
3. `http://127.0.0.1:8787` for localhost/file development.

This prevents a development page from silently saving data into the production worker.

## Production Database

Production continues to use:

- Worker: `lacurent`
- D1: `lacurent-db`
- D1 id: `91b70c8a-3c11-4fe0-81ed-e3b64a075118`

Do not point development to this database.
