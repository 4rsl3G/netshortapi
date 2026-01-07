import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));
app.use(cors({ origin: process.env.CORS_ORIGIN }));

const base = process.env.NETSHORT_BASE;
const token = process.env.NETSHORT_TOKEN;

if (!base || !token) {
  console.error("Missing NETSHORT_BASE or NETSHORT_TOKEN in .env");
  process.exit(1);
}

const upstream = axios.create({
  baseURL: base,
  timeout: 15000,
  headers: { Authorization: `Bearer ${token}` },
});

async function forward(res, reqPromise) {
  try {
    const r = await reqPromise;
    res.status(200).json(r.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({
      ok: false,
      message: err?.response?.data || err?.message || "Proxy error",
    });
  }
}

app.get("/health", (req, res) => res.json({ ok: true, name: "PANSA Proxy" }));

app.get("/netshort/languages", (req, res) => forward(res, upstream.get("/languages")));

app.get("/netshort/tabs", (req, res) => {
  const lang = req.query.lang || "id_ID";
  forward(res, upstream.get(`/tabs?lang=${encodeURIComponent(lang)}`));
});

app.get("/netshort/home", (req, res) => {
  const { tabId, limit = 10, offset = 0, lang = "id_ID" } = req.query;
  if (!tabId) return res.status(400).json({ ok: false, message: "tabId required" });

  const url =
    `/get-home?tabId=${encodeURIComponent(tabId)}` +
    `&limit=${encodeURIComponent(limit)}` +
    `&offset=${encodeURIComponent(offset)}` +
    `&lang=${encodeURIComponent(lang)}`;

  forward(res, upstream.get(url));
});

app.get("/netshort/recommend", (req, res) => {
  const { limit = 10, offset = 0, lang = "id_ID" } = req.query;
  const url =
    `/recommend?limit=${encodeURIComponent(limit)}` +
    `&offset=${encodeURIComponent(offset)}` +
    `&lang=${encodeURIComponent(lang)}`;
  forward(res, upstream.get(url));
});

app.get("/netshort/member", (req, res) => {
  const { limit = 10, offset = 0, lang = "id_ID" } = req.query;
  const url =
    `/member?limit=${encodeURIComponent(limit)}` +
    `&offset=${encodeURIComponent(offset)}` +
    `&lang=${encodeURIComponent(lang)}`;
  forward(res, upstream.get(url));
});

app.get("/netshort/search", (req, res) => {
  const { keyword = "", limit = 20, offset = 0, lang = "id_ID" } = req.query;
  const url =
    `/search?keyword=${encodeURIComponent(keyword)}` +
    `&limit=${encodeURIComponent(limit)}` +
    `&offset=${encodeURIComponent(offset)}` +
    `&lang=${encodeURIComponent(lang)}`;
  forward(res, upstream.get(url));
});

app.get("/netshort/search/recommend", (req, res) => {
  const lang = req.query.lang || "id_ID";
  forward(res, upstream.get(`/search/recommend?lang=${encodeURIComponent(lang)}`));
});

app.get("/netshort/episodes/:shortPlayId", (req, res) => {
  const { shortPlayId } = req.params;
  forward(res, upstream.get(`/getepisode/${encodeURIComponent(shortPlayId)}?`));
});

app.get("/netshort/video", (req, res) => {
  const { shortPlayId, episodeId, episodeNo } = req.query;
  if (!shortPlayId || !episodeId || !episodeNo) {
    return res.status(400).json({ ok: false, message: "shortPlayId, episodeId, episodeNo required" });
  }
  const url =
    `/getepisode/${encodeURIComponent(shortPlayId)}/${encodeURIComponent(episodeId)}` +
    `?episodeNo=${encodeURIComponent(episodeNo)}`;
  forward(res, upstream.get(url));
});

app.listen(process.env.PORT || 5050, () => {
  console.log(`PANSA Proxy listening on http://localhost:${process.env.PORT || 5050}`);
});
