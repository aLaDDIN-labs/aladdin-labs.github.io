// Pulls the works list from ORCID (public API), enriches each DOI with Crossref
// (authors, journal, type), and writes data/publications.json.
//
// Usage:  node scripts/sync-orcid.mjs [ORCID_ID]
// Default ORCID comes from data/site.yaml (contact.orcid).
// Notes:
//  - If ORCID or Crossref cannot be reached, the existing publications.json is kept.
//  - Per-paper tags / selected flags live in data/publication-meta.yaml (keyed by DOI).
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const root = process.cwd();
const site = YAML.parse(fs.readFileSync(path.join(root, "data/site.yaml"), "utf8"));
const orcid = process.argv[2] || site.contact.orcid;
const outFile = path.join(root, "data/publications.json");
const MAILTO = process.env.CROSSREF_MAILTO || ""; // optional: polite-pool for Crossref

const getJson = async (url) => {
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": `aladdin-lab-site${MAILTO ? ` (mailto:${MAILTO})` : ""}` } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

const normDoi = (d) => (d || "").toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "").trim();

function doiOf(summary) {
  const ids = summary?.["external-ids"]?.["external-id"] ?? [];
  const hit = ids.find((e) => e["external-id-type"] === "doi");
  return hit ? normDoi(hit["external-id-value"]) : "";
}

function initials(given) {
  return (given || "")
    .split(/[\s-]+/).filter(Boolean).map((s) => s[0].toUpperCase()).join("");
}

function authorsFromCrossref(list = []) {
  return list
    .map((a) => (a.family ? `${a.family} ${initials(a.given)}`.trim() : a.name || ""))
    .filter(Boolean).join(", ");
}

function typeFromCrossref(t, journal) {
  if (t === "posted-content") return "preprint";
  if (t === "proceedings-article") return "conference";
  if (/review/i.test(journal || "")) return "review";
  return "journal";
}

async function main() {
  console.log(`ORCID ${orcid}`);
  const works = await getJson(`https://pub.orcid.org/v3.0/${orcid}/works`);
  const groups = works.group ?? [];
  console.log(`ORCID groups: ${groups.length}`);

  const items = [];
  for (const g of groups) {
    const s = g["work-summary"]?.[0];
    if (!s) continue;
    const year = Number(s["publication-date"]?.year?.value) || 0;
    items.push({
      title: s.title?.title?.value ?? "",
      journal: s["journal-title"]?.value ?? "",
      year,
      doi: doiOf(g["external-ids"] ? { "external-ids": g["external-ids"] } : s) || doiOf(s),
      url: s.url?.value ?? "",
      orcidType: s.type ?? "",
    });
  }

  const out = [];
  for (const it of items) {
    let authors = "", journal = it.journal, year = it.year, title = it.title;
    let type = it.orcidType === "JOURNAL_ARTICLE" ? "journal" : it.orcidType === "CONFERENCE_PAPER" ? "conference" : "journal";
    if (it.doi) {
      try {
        const { message: m } = await getJson(`https://api.crossref.org/works/${encodeURIComponent(it.doi)}`);
        authors = authorsFromCrossref(m.author);
        journal = (m["container-title"] ?? [])[0] || (m.institution?.[0]?.name) || journal || (m.type === "posted-content" ? "bioRxiv" : "");
        title = (m.title ?? [])[0] || title;
        const dp = (m.issued ?? m.published ?? {})["date-parts"]?.[0];
        if (dp?.[0]) year = dp[0];
        type = typeFromCrossref(m.type, journal);
      } catch (e) {
        console.warn(`Crossref miss for ${it.doi}: ${e.message}`);
      }
    }
    out.push({
      title: title.replace(/<[^>]+>/g, "").trim(),
      authors,
      journal,
      year,
      type,
      doi: it.doi,
      url: it.doi ? `https://doi.org/${it.doi}` : it.url,
    });
  }

  out.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${out.length} publications -> data/publications.json`);
}

main().catch((e) => {
  console.error("Sync failed; keeping existing publications.json:", e.message);
  process.exit(process.env.CI ? 1 : 0);
});
