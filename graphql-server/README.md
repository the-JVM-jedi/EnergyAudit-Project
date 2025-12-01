# GraphQL Server (Apollo) — EnergyAudit-Project

This small GraphQL server provides queries and mutations for the existing `Audits` and `Devices` tables in the project's MySQL database. It's intended to run alongside the current PHP backend while you migrate frontend calls.

Quick start

1. Copy `.env.example` to `.env` and fill in your DB credentials.

2. From PowerShell (Windows), install dependencies:

```powershell
cd graphql-server
npm install
```

3. Run the server:

```powershell
npm start
```

4. Open the GraphQL Playground (usually at `http://localhost:4000/`) and try queries such as:

```graphql
query { audits { audit_id audit_name created_at } }
```

Telemetry ingestion endpoint

- The server exposes a simple REST endpoint to accept telemetry uploads from agents:

	- `POST /ingest`
	- Headers: `x-api-key: <INGEST_API_KEY>`
	- Body: plain CSV text (each line `timestamp,wattage`) or JSON `{ source, csv }`.

Example using `curl`:

```powershell
curl -X POST "http://localhost:4000/ingest?source=lab1" -H "x-api-key: changeme" -H "Content-Type: text/csv" --data-binary @power_consumption_log.csv
```

This endpoint will parse simple `timestamp,wattage` lines and insert them into the `Telemetry` table. For production, change `INGEST_API_KEY` in `.env` to a secure value and consider HTTPS and stronger authentication.

Next steps
- Add CSV parsing and save telemetry into a dedicated `Telemetry` table.
- Add authentication (API keys or JWT) for telemetry ingestion.
- Update `features/script.js` to POST GraphQL queries/mutations instead of the existing REST endpoints.
