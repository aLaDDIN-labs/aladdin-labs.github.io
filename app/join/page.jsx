import { L } from "../../components/L";
import { getSite } from "../../lib/data";

export const metadata = { title: "Join" };

export default function Join() {
  const { contact } = getSite();
  return (
    <>
      <header className="page-head">
        <div className="container">
          <p className="eyebrow"><L en="Join" ko="합류" /></p>
          <h1 className="h1"><L en="Join the lab" ko="연구실 합류" /></h1>
        </div>
      </header>
      <div className="container prose">
        <p className="body-lg">
          <L
            en="We welcome students and postdoctoral researchers interested in structural biology, degrader discovery and neural circuit pharmacology. Placeholder text: replace with current openings."
            ko="구조생물학, 분해제 발굴, 신경회로 약리학에 관심 있는 학생과 박사후연구원을 환영합니다. 임시 문구입니다. 현재 모집 내용으로 교체해 주세요."
          />
        </p>
        <p>
          <L en="Please send a CV and a short statement of interest to " ko="이력서와 관심 연구 분야에 대한 간단한 소개를 다음 주소로 보내 주세요: " />
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </p>
      </div>
    </>
  );
}
