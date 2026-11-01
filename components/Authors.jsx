// PI name: bold orange + mark (* / #) when corresponding / co-first, bold black otherwise.
export default function Authors({ text, mark, piName, pos = 1 }) {
  if (!piName) return text;
  const all = [...text.matchAll(new RegExp(`(${piName})`, "g"))];
  const m = all[Math.min(Math.max(pos, 1), all.length) - 1];
  if (!m) return text;
  const cls = mark ? "pi-mark" : "pi-self";
  return (<>{text.slice(0, m.index)}<b className={cls}>{m[0]}{mark}</b>{text.slice(m.index + m[0].length)}</>);
}
