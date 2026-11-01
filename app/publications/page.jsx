import PageBanner from "../../components/PageBanner";
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
      <PageBanner src="/images/banners/publications.webp" alt="Illustration of reading and writing papers" eyebrow="Publications" light="Research from" wordmark focus="-50%" />
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
