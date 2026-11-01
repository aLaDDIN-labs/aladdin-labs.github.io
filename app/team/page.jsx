import { L, T } from "../../components/L";
import { getTeam } from "../../lib/data";

export const metadata = { title: "Members" };

const GROUPS = [
  { id: "pi", en: "PI" },
  { id: "current", en: "Current" },
  { id: "alumni", en: "Alumni" },
];

export default function Team() {
  const team = getTeam().map((m) => (m.group === "member" ? { ...m, group: "current" } : m));
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return (
    <>
      <header className="page-head">
        <div className="container">
          <p className="eyebrow">Members</p>
          <h1 className="h1">Members</h1>
        </div>
      </header>
      <div className="container">
        {GROUPS.map((g) => {
          const list = team.filter((m) => m.group === g.id);
          if (!list.length) return null;
          return (
            <section key={g.id} className="team-group">
              <h2 className="eyebrow"><L en={g.en} ko={g.ko} /></h2>
              <div className="member-grid">
                {list.map((m) => (
                  <article key={m.id} className="member">
                    <div className="avatar avatar-lg" aria-hidden="true">
                      {m.photo ? <img src={base + m.photo} alt="" loading="lazy" /> : <span>{(m.name.en || "?")[0]}</span>}
                    </div>
                    <div>
                      <h3 className="h3"><T v={m.name} /></h3>
                      <p className="role"><T v={m.role} /></p>
                      {m.position && <p className="muted small"><T v={m.position} /></p>}
                      {m.bio && <p className="muted"><T v={m.bio} /></p>}
                      {m.links && (
                        <p className="links">
                          {Object.entries(m.links).filter(([, v]) => v).map(([k, v]) => (
                            <a key={k} href={k === "email" ? `mailto:${v}` : v} target="_blank" rel="noreferrer">{k}</a>
                          ))}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
