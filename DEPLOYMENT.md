# Deployment

This app is a single Node.js web service. It serves static files and exposes
`/api/scoreboard` for live scoreboard data.

## Required Settings

- Node.js: 20 or newer
- Start command: `npm start`
- Health check path: `/healthz`
- Environment variables:
  - `PORT`: provided by most hosting platforms
  - `SCOREBOARD_CACHE_MS`: defaults to `8000`

## Render

The repository includes `render.yaml`.

1. Push this folder to GitHub.
2. In Render, choose **New +** -> **Blueprint** or **Web Service**.
3. Select the GitHub repository.
4. Deploy.

If configuring manually:

- Runtime: Node
- Build command: leave empty
- Start command: `npm start`
- Health check path: `/healthz`

## Railway

1. Create a new Railway project from the GitHub repository.
2. Set the start command to `npm start` if Railway does not detect it.
3. Add `SCOREBOARD_CACHE_MS=8000` if desired.

## Vercel

Vercel does not run `node server.mjs` as a persistent server. This repository
therefore includes serverless functions under `api/` and `vercel.json`.

Use these settings:

- Framework Preset: Other
- Build Command: leave empty
- Output Directory: leave empty
- Install Command: `npm install` or leave empty

The frontend is served as static files, while `/api/scoreboard` and `/healthz`
are served by Vercel functions.

## Docker

```bash
docker build -t kbo-standings-simulator .
docker run -p 4173:4173 kbo-standings-simulator
```

## Operational Notes

The server caches scoreboard responses for a short time so that many clients do
not trigger a separate upstream request every 10 seconds. If traffic grows, use
a longer `SCOREBOARD_CACHE_MS` value or put a CDN/reverse proxy in front of the
service.
