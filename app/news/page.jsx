import PageBanner from "../../components/PageBanner";
import { T } from "../../components/L";
import { getNews } from "../../lib/data";

export const metadata = { title: "News" };

const fmt = (d) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export default function News() {
  const news = getNews();
  const years = [...new Set(news.map((n) => String(n.date).slice(0, 4)))];
  return (
    <>
      <PageBanner src="/images/banners/news.webp" alt="Illustration of lab news and media" eyebrow="News" light="The latest from" wordmark focus="-50%" />
      <div className="container news-page">
        {years.map((y) => (
          <section key={y} className="news-year">
            <h2 className="eyebrow">{y}</h2>
            <ul className="news-cards">
              {news.filter((n) => String(n.date).startsWith(y)).map((n, i) => (
                <li key={i} className="news-card">
                  <div className="news-meta">
                    <time dateTime={n.date}>{fmt(n.date)}</time>
                    {n.tag && <span className="chip-tag">{n.tag}</span>}
                  </div>
                  <h3 className="h3">{n.link ? <a href={n.link} target="_blank" rel="noreferrer"><T v={n.title} /></a> : <T v={n.title} />}</h3>
                  {n.summary && <p className="muted"><T v={n.summary} /></p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {news.length === 0 && <p className="muted">No news yet.</p>}
      </div>
    </>
  );
}
