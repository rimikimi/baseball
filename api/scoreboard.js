import { scoreboardResponse } from "../scoreboard-data.mjs";

export default async function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=8, stale-while-revalidate=10");
  try {
    res.status(200).json(await scoreboardResponse());
  } catch (error) {
    res.status(502).json({
      error: error.message,
    });
  }
}
