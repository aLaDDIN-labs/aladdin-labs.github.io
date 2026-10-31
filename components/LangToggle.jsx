"use client";
import { useEffect, useState } from "react";

export default function LangToggle() {
  const [lang, setLang] = useState("en");
  useEffect(() => setLang(document.documentElement.dataset.lang || "en"), []);
  const set = (l) => {
    document.documentElement.dataset.lang = l;
    document.documentElement.lang = l;
    try { localStorage.setItem("lang", l); } catch (e) {}
    setLang(l);
  };
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button type="button" aria-pressed={lang === "ko"} onClick={() => set("ko")}>한국어</button>
      <button type="button" aria-pressed={lang === "en"} onClick={() => set("en")}>English</button>
    </div>
  );
}
