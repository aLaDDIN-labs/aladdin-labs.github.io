// PI name: bold orange + mark (* / #) when corresponding / co-first, bold black otherwise.
export default function Authors({ text, mark, piName }) {
  if (!piName) return text;
  const m = text.match(new RegExp(`(${piName})`));
  if (!m) return text;
  const cls = mark ? "pi-mark" : "pi-self";
  return (<>{text.slice(0, m.index)}<b className={cls}>{m[0]}{mark}</b>{text.slice(m.index + m[0].length)}</>);
}
