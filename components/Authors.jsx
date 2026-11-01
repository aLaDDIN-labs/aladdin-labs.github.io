export default function Authors({ text, mark, piName }) {
  if (!mark || !piName) return text;
  const re = new RegExp(`(${piName})`);
  const m = text.match(re);
  if (!m) return text;
  return (<>{text.slice(0, m.index)}<b className="pi-mark">{m[0]}{mark}</b>{text.slice(m.index + m[0].length)}</>);
}
