import { getTeam } from "../../lib/data";
import TeamBrowser from "../../components/TeamBrowser";

export const metadata = { title: "Members" };

export default function Team() {
  const team = getTeam().map((m) => (m.group === "member" ? { ...m, group: "current" } : m));
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return (
    <>
      <header className="team-banner">
        <img src={`${base}/images/members-banner.webp`} alt="Illustration of ALADDIN lab members at work" />
        <div className="team-overlay">
          <p className="eyebrow">Members</p>
          <h1 className="team-title"><span className="light">The people of</span> <span className="aw"><i>a</i>L<i>a</i>DDIN</span></h1>
        </div>
      </header>
      <TeamBrowser people={team} base={base} />
    </>
  );
}
