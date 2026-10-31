import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const root = process.cwd();
const readYaml = (f) => YAML.parse(fs.readFileSync(path.join(root, "data", f), "utf8"));
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(root, "data", f), "utf8"));

export const getSite = () => readYaml("site.yaml");
export const getResearch = () => readYaml("research.yaml");
export const getTeam = () => readYaml("team.yaml") ?? [];
export const getNews = () =>
  (readYaml("news.yaml") ?? []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));

const norm = (doi) => (doi || "").toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "").trim();

/**
 * Merge ORCID/Crossref records (publications.json) + manual entries + annotations
 * (publication-meta.yaml). Topics = explicit tags + keyword matches on title/journal.
 */
export function getPublications() {
  const site = getSite();
  const meta = readYaml("publication-meta.yaml") ?? {};
  const manual = readYaml("publications-manual.yaml") ?? [];
  const synced = readJson("publications.json");
  const metaByDoi = Object.fromEntries(Object.entries(meta).map(([k, v]) => [norm(k), v]));
  const rules = site.topics.map((t) => ({ id: t.id, re: new RegExp(t.keywords, "i") }));

  const seen = new Set();
  const out = [];
  for (const p of [...synced, ...manual]) {
    const doi = norm(p.doi);
    const key = doi || `${p.title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const m = metaByDoi[doi] ?? {};
    if (m.hidden) continue;
    const text = `${p.title} ${p.journal}`;
    const topics = new Set(m.tags ?? []);
    for (const r of rules) if (r.re.test(text)) topics.add(r.id);
    if (p.type === "review") topics.add("review");
    out.push({
      title: p.title,
      authors: p.authors ?? "",
      journal: p.journal ?? "",
      year: Number(p.year) || 0,
      type: p.type ?? "journal",
      doi,
      url: p.url || (doi ? `https://doi.org/${doi}` : ""),
      figure: m.figure ?? "",
      selected: m.selected === true,
      topics: [...topics],
    });
  }
  out.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  return out;
}
