import { getTeam } from "../../lib/data";
import PageBanner from "../../components/PageBanner";
import TeamBrowser from "../../components/TeamBrowser";

export const metadata = { title: "Members" };

export default function Team() {
  const team = getTeam().map((m) => (m.group === "member" ? { ...m, group: "current" } : m));
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return (
    <>
      <PageBanner src="/images/members-banner.webp" alt="Illustration of ALADDIN lab members at work" eyebrow="Members" light="The people of" wordmark focus="-62%" />
      <TeamBrowser people={team} base={base} />
    </>
  );
}
