import PageBanner from "../../components/PageBanner";
import OutreachGallery from "../../components/OutreachGallery";
import { getOutreach } from "../../lib/data";

export const metadata = { title: "Outreach", description: "Photos from ALADDIN lab events, talks and everyday lab life." };

export default function Outreach() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return (
    <>
      <PageBanner src="/images/banners/outreach.webp" alt="Illustration of lab outreach with students" eyebrow="Outreach" light="Science for" bold="everyone" focus="-50%" />
      <OutreachGallery items={getOutreach()} base={base} />
    </>
  );
}
