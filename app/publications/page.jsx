import PublicationList from "../../components/PublicationList";
import { L } from "../../components/L";
import { getPublications, getPatents, getSite } from "../../lib/data";

export const metadata = { title: "Publications" };

export default function Publications() {
  const pubs = getPublications();
  const patents = getPatents();
  const { topics, pi_name } = getSite();
  return (
    <>
      <header className="page-head">
        <div className="container">
          <p className="eyebrow"><L en="Publications" ko="논문" /></p>
          <h1 className="h1"><L en="Publications" ko="논문" /></h1>
        </div>
      </header>
      {pubs.length === 0 && patents.length === 0 ? (
        <div className="container pub-body">
          <p className="muted">
            <L
              en="No publications yet. Run `npm run sync:orcid` or wait for the scheduled sync."
              ko="아직 논문이 없습니다. `npm run sync:orcid`를 실행하거나 예약된 동기화를 기다려 주세요."
            />
          </p>
        </div>
      ) : (
        <PublicationList pubs={pubs} topics={topics} piName={pi_name} patents={patents} />
      )}
    </>
  );
}
