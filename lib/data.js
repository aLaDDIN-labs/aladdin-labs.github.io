import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const root = process.cwd();
const readYaml = (f) => YAML.parse(fs.readFileSync(path.join(root, "data", f), "utf8"));
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(root, "data", f), "utf8"));

export const getSite = () => readYaml("site.yaml");
export const getResearch = () => readYaml("research.yaml");
export const getTeam = () => readYaml("team.yaml") ?? [];
export const getPatents = () =>
  (readYaml("patents.yaml") ?? []).slice().sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
export const getContact = () => readYaml("contact.yaml") ?? {};
export const getOutreach = () =>
  (readYaml("outreach.yaml") ?? []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
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

  const markRules = (site.author_marks ?? []).map((r) => ({
    journal: r.journal ? new RegExp(r.journal, "i") : null,
    title: r.title ? new RegExp(r.title, "i") : null,
    year: r.year ? Number(r.year) : null,
    mark: r.mark,
    pos: r.pos,
  }));
  const seen = new Set();
  const out = [];
  // A manual entry replaces a synced record with the same title (manual author list is authoritative).
  const tkey = (t) => String(t ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const manualTitles = new Set(manual.map((p) => tkey(p.title)));
  const syncedKept = synced.filter((p) => !manualTitles.has(tkey(p.title)));
  for (const p of [...syncedKept, ...manual]) {
    const doi = norm(p.doi);
    const key = doi || `${p.title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const m = metaByDoi[doi] ?? {};
    if (m.hidden) continue;
    const text = `${p.title} ${p.journal}`;
    const topics = new Set([...(p.tags ?? []), ...(m.tags ?? [])]);
    for (const r of rules) if (r.re.test(text)) topics.add(r.id);
    const rule = markRules.find((r) =>
      (!r.journal || r.journal.test((p.journal ?? "").trim())) &&
      (!r.title || r.title.test(p.title ?? "")) &&
      (!r.year || r.year === Number(p.year)));
    const mark = m.mark ?? p.mark ?? rule?.mark ?? "";
    // pos: which "Kim D" in the author list is the PI (1 = first match, 2 = second ...)
    const piPos = Number(m.pos ?? p.pos ?? rule?.pos ?? 1) || 1;
    out.push({
      mark,
      piPos,
      title: p.title,
      authors: p.authors ?? "",
      journal: p.journal ?? "",
      year: Number(p.year) || 0,
      type: p.type ?? "journal",
      status: p.status ?? "",
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
