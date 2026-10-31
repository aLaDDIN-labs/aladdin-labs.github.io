import { L, T } from "../../components/L";
import { getSite } from "../../lib/data";

export const metadata = { title: "Contact" };

export default function Contact() {
  const { contact, affiliations } = getSite();
  return (
    <>
      <header className="page-head">
        <div className="container">
          <p className="eyebrow"><L en="Contact" ko="연락처" /></p>
          <h1 className="h1"><L en="Contact" ko="연락처" /></h1>
        </div>
      </header>
      <div className="container prose">
        <p><a href={`mailto:${contact.email}`}>{contact.email}</a></p>
        <p><T v={contact.address} /></p>
        <ul className="plain">
          {affiliations.map((a, i) => (<li key={i}><T v={a} /></li>))}
        </ul>
      </div>
    </>
  );
}
