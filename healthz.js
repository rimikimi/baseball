import { cacheTtlMs } from "../scoreboard-data.mjs";

export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    cacheTtlMs,
  });
}
