import { getTeam } from "../../lib/data";
import TeamBrowser from "../../components/TeamBrowser";

export const metadata = { title: "Members" };

export default function Team() {
  const team = getTeam().map((m) => (m.group === "member" ? { ...m, group: "current" } : m));
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return (
    <>
      <header className="team-hero" style={{ backgroundImage: `url(${base}/images/members-art.webp)` }}>
        <div className="container">
          <p className="eyebrow">Members</p>
          <h1 className="team-title"><span className="light">The people of</span> <span className="aw"><i>a</i>L<i>a</i>DDIN</span></h1>
        </div>
      </header>
      <TeamBrowser people={team} base={base} />
    </>
  );
}
