// Lab note PDF: logos, date, experimenter, then content blocks (text, tables, vector plate maps).
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const MM = { l: 14, r: 14, top: 22, bottom: 16 };
const ORANGE = [168, 90, 0], INK = [23, 24, 26], MUTED = [95, 99, 107], CREAM = [250, 246, 235], LINE = [230, 227, 218];

const b64 = (buf) => { let s = ""; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
async function loadFont(doc, file, style) {
  const r = await fetch(`${BASE}/fonts/pdf/${file}`); if (!r.ok) throw new Error("font " + file);
  const name = file;
  doc.addFileToVFS(name, b64(await r.arrayBuffer())); doc.addFont(name, "NotoSansKR", style);
}
async function loadLogo(url) {
  try {
    const r = await fetch(url, { cache: "no-store" }); if (!r.ok || !(r.headers.get("content-type") || "").startsWith("image")) return null;
    const blob = await r.blob(); const obj = URL.createObjectURL(blob);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = obj; });
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext("2d").drawImage(img, 0, 0); URL.revokeObjectURL(obj);
    return { data: c.toDataURL("image/png"), w: c.width, h: c.height };
  } catch { return null; }
}

// blocks: {t:"h", text} {t:"p", text} {t:"kv", rows:[[k,v]]} {t:"table", title, head:[], rows:[[]], widths?, align?}
//         {t:"svg", svg, caption?} {t:"legend", items:[[css color, label]]}
export async function buildLabNote({ blocks, meta, orientation = "portrait", filename }) {
  const { jsPDF } = await import("jspdf"); await import("svg2pdf.js"); const at = (await import("jspdf-autotable")); const autoTable = at.default || at.autoTable;
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  await loadFont(doc, "NotoSansKR-Subset-Regular.ttf", "normal"); await loadFont(doc, "NotoSansKR-Subset-Bold.ttf", "bold");
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), cw = W - MM.l - MM.r;
  const setF = (size, bold, color = INK) => { doc.setFont("NotoSansKR", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...color); };
  const logoA = await loadLogo(`${BASE}/images/brand/logo.png`);
  const logoK = await loadLogo(`${BASE}/images/brand/krict-logo.png`);

  // ---- header (first page)
  let y = 12;
  if (logoA) { const h = 15, w = (h * logoA.w) / logoA.h; doc.addImage(logoA.data, "PNG", MM.l, y, w, h); }
  if (logoK) { const h = 11, w = (h * logoK.w) / logoK.h; doc.addImage(logoK.data, "PNG", W - MM.r - w, y + 2, w, h); }
  else { setF(15, true, [0, 90, 150]); doc.text("KRICT", W - MM.r, y + 8, { align: "right" }); setF(6.5, false, MUTED); doc.text("Korea Research Institute of Chemical Technology", W - MM.r, y + 12.5, { align: "right" }); }
  y = 36;
  setF(8.5, true, ORANGE); doc.text("LAB NOTE", MM.l, y, { charSpace: 0.8 }); y += 7;
  setF(17, true); const tl = doc.splitTextToSize(meta.title || "Lab note", cw); doc.text(tl, MM.l, y); y += tl.length * 7 + 1;
  // info box
  const boxH = 15; doc.setFillColor(...CREAM); doc.setDrawColor(...LINE); doc.roundedRect(MM.l, y, cw, boxH, 2.5, 2.5, "FD");
  const cols = [["DATE", meta.date || ""], ["EXPERIMENTER", meta.who || ""], ["LAB", "ALADDIN Lab, KRICT"]];
  const cwid = cw / cols.length;
  cols.forEach(([k, v], i) => { const x = MM.l + 5 + i * cwid; setF(6.5, true, MUTED); doc.text(k, x, y + 5.2, { charSpace: 0.5 }); setF(10.5, true); doc.text(doc.splitTextToSize(v || "–", cwid - 8)[0], x, y + 11); });
  y += boxH + 6;
  if (meta.notes && meta.notes.trim()) { setF(9, false); const nl = doc.splitTextToSize(meta.notes.trim(), cw); doc.text(nl, MM.l, y); y += nl.length * 4.2 + 3; }

  const need = (h) => { if (y + h > H - MM.bottom) { doc.addPage(); y = MM.top; } };
  // ---- blocks
  for (const b of blocks) {
    if (b.t === "h") { need(14); y += 2; setF(12, true); doc.text(b.text, MM.l, y); y += 1.6; doc.setDrawColor(...ORANGE); doc.setLineWidth(0.4); doc.line(MM.l, y, MM.l + 14, y); y += 5; }
    else if (b.t === "p") { setF(8.5, false, MUTED); const l = doc.splitTextToSize(b.text, cw); need(l.length * 4 + 2); doc.text(l, MM.l, y); y += l.length * 4 + 2; }
    else if (b.t === "kv") {
      autoTable(doc, { startY: y, margin: { left: MM.l, right: MM.r, top: MM.top, bottom: MM.bottom }, body: b.rows, theme: "plain", styles: { font: "NotoSansKR", fontSize: 8.5, cellPadding: { top: 1.3, bottom: 1.3, left: 1, right: 2 }, textColor: INK, overflow: "linebreak" }, columnStyles: { 0: { cellWidth: 40, textColor: MUTED }, 1: { fontStyle: "normal" } }, didParseCell: (d) => { if (d.column.index === 0) d.cell.styles.fontStyle = "normal"; } });
      y = doc.lastAutoTable.finalY + 4;
    } else if (b.t === "table") {
      if (b.title) { need(16); setF(9, true, MUTED); doc.text(b.title.toUpperCase(), MM.l, y, { charSpace: 0.4 }); y += 3; }
      autoTable(doc, { startY: y, margin: { left: MM.l, right: MM.r, top: MM.top, bottom: MM.bottom }, head: [b.head], body: b.rows, foot: b.foot ? [b.foot] : undefined, theme: "grid",
        styles: { font: "NotoSansKR", fontSize: b.fontSize || 8, cellPadding: 1.6, textColor: INK, lineColor: LINE, lineWidth: 0.2, overflow: "linebreak", valign: "middle" },
        headStyles: { fillColor: CREAM, textColor: INK, fontStyle: "bold", lineColor: LINE }, footStyles: { fillColor: CREAM, textColor: INK, fontStyle: "bold" }, alternateRowStyles: { fillColor: [253, 252, 248] },
        columnStyles: b.widths ? Object.fromEntries(b.widths.map((w, i) => [i, w ? { cellWidth: w } : {}])) : undefined });
      y = doc.lastAutoTable.finalY + 6;
    } else if (b.t === "legend") {
      setF(8, false); let x = MM.l; need(7);
      for (const [c, l] of b.items) { const w = doc.getTextWidth(l) + 9; if (x + w > W - MM.r) { x = MM.l; y += 5; need(6); } doc.setFillColor(c); doc.circle(x + 1.6, y - 1.1, 1.6, "F"); doc.setTextColor(...INK); doc.text(l, x + 5, y); x += w; }
      y += 6;
    } else if (b.t === "svg") {
      const holder = document.createElement("div"); holder.style.cssText = "position:fixed;left:-99999px;top:0"; holder.innerHTML = b.svg; document.body.appendChild(holder);
      const el = holder.querySelector("svg"); const vb = el.getAttribute("viewBox").split(" ").map(Number);
      el.setAttribute("width", vb[2]); el.setAttribute("height", vb[3]); el.setAttribute("font-family", "NotoSansKR"); el.style.fontFamily = "NotoSansKR"; el.querySelectorAll("text").forEach((t) => { t.setAttribute("font-family", "NotoSansKR"); t.style.fontFamily = "NotoSansKR"; if (t.getAttribute("font-weight")) t.setAttribute("font-weight", "bold"); });
      const w = cw, h = (w * vb[3]) / vb[2]; need(h + (b.caption ? 8 : 3));
      if (b.caption) { setF(9, true, MUTED); doc.text(b.caption.toUpperCase(), MM.l, y, { charSpace: 0.4 }); y += 3; }
      await doc.svg(el, { x: MM.l, y, width: w, height: h }); holder.remove(); y += h + 3;
    }
  }
  if (meta.sign) {
    need(34); y += 8; doc.setDrawColor(...MUTED); doc.setLineWidth(0.2); setF(8, false, MUTED);
    const half = (cw - 10) / 2;
    [["Experimenter signature", MM.l], ["Reviewed by", MM.l + half + 10]].forEach(([t, x]) => { doc.line(x, y + 10, x + half, y + 10); doc.text(t, x, y + 14); });
    y += 18; [["Date", MM.l], ["Date", MM.l + half + 10]].forEach(([t, x]) => { doc.line(x, y + 4, x + half, y + 4); doc.text(t, x, y + 8); });
  }
  // ---- running header and footer
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    if (i > 1) { setF(7.5, false, MUTED); doc.text(`Lab note · ${meta.title || ""}`, MM.l, 12); doc.text(`${meta.date || ""}${meta.who ? " · " + meta.who : ""}`, W - MM.r, 12, { align: "right" }); doc.setDrawColor(...LINE); doc.line(MM.l, 14, W - MM.r, 14); }
    doc.setDrawColor(...LINE); doc.line(MM.l, H - 11, W - MM.r, H - 11);
    setF(7, false, MUTED); doc.text("ALADDIN Lab · KRICT · Prepared with the Plate planner. Values are calculated from the entered numbers; check them before use.", MM.l, H - 7); doc.text(`Page ${i} / ${n}`, W - MM.r, H - 7, { align: "right" });
  }
  doc.save(filename);
}
