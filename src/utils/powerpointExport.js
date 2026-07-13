import { formatCHF, formatPercent } from './calculations';

const SLIDE_W = 12192000;
const SLIDE_H = 6858000;

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function emu(value) {
  return Math.round(value * 914400);
}

function crc32(bytes) {
  let table = crc32.table;
  if (!table) {
    table = Array.from({ length: 256 }, (_, n) => {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      return c >>> 0;
    });
    crc32.table = table;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(buffer, value) {
  buffer.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeU32(buffer, value) {
  buffer.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function createZip(files) {
  const encoder = new TextEncoder();
  const out = [];
  const central = [];
  let offset = 0;

  files.forEach(({ name, content }) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = [];

    writeU32(local, 0x04034b50);
    writeU16(local, 20);
    writeU16(local, 0);
    writeU16(local, 0);
    writeU16(local, 0);
    writeU16(local, 0);
    writeU32(local, crc);
    writeU32(local, data.length);
    writeU32(local, data.length);
    writeU16(local, nameBytes.length);
    writeU16(local, 0);
    local.push(...nameBytes, ...data);
    out.push(...local);

    const header = [];
    writeU32(header, 0x02014b50);
    writeU16(header, 20);
    writeU16(header, 20);
    writeU16(header, 0);
    writeU16(header, 0);
    writeU16(header, 0);
    writeU16(header, 0);
    writeU32(header, crc);
    writeU32(header, data.length);
    writeU32(header, data.length);
    writeU16(header, nameBytes.length);
    writeU16(header, 0);
    writeU16(header, 0);
    writeU16(header, 0);
    writeU16(header, 0);
    writeU32(header, 0);
    writeU32(header, offset);
    header.push(...nameBytes);
    central.push(...header);
    offset += local.length;
  });

  const centralOffset = out.length;
  out.push(...central);
  writeU32(out, 0x06054b50);
  writeU16(out, 0);
  writeU16(out, 0);
  writeU16(out, files.length);
  writeU16(out, files.length);
  writeU32(out, central.length);
  writeU32(out, centralOffset);
  writeU16(out, 0);

  return new Blob([new Uint8Array(out)], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
}

function shape(id, x, y, w, h, fill = '111111', line = '111111') {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="${line}"/></a:solidFill></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`;
}

function textBox(id, text, x, y, w, h, size = 1800, color = '1F2937', bold = false) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/><a:p><a:r><a:rPr lang="fr-CH" sz="${size}" ${bold ? 'b="1"' : ''}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>${esc(text)}</a:t></a:r></a:p></p:txBody></p:sp>`;
}

function tableRows(items) {
  return items.slice(0, 6).map((property, index) => {
    const a = property.analysis || {};
    return `${index + 1}. ${property.nom_bien || 'Bien'} | ${property.ville || 'Ville inconnue'} | Score ${Math.round(a.score_global || 0)}/100 | ${formatCHF(a.prix_total)} | Net/FP ${formatPercent(a.rendement_net_fonds_propres || 0)}`;
  }).join('\n');
}

function slideXml(title, subtitle, blocks = []) {
  const shapes = [
    shape(2, 0, 0, 13.333, 0.72, '111111'),
    textBox(3, title, 0.55, 0.2, 8.8, 0.38, 2200, 'FFFFFF', true),
    textBox(4, subtitle, 0.55, 0.82, 10.8, 0.34, 1050, '6B7280'),
    shape(5, 11.35, 0.17, 1.25, 0.28, 'A5D63A', 'A5D63A'),
  ];

  blocks.forEach((block, index) => {
    const id = 10 + index * 3;
    shapes.push(shape(id, block.x, block.y, block.w, block.h, block.fill || 'F8FAFC', block.line || 'E5E7EB'));
    shapes.push(textBox(id + 1, block.title, block.x + 0.22, block.y + 0.16, block.w - 0.44, 0.28, 1150, block.accent || '111827', true));
    shapes.push(textBox(id + 2, block.body, block.x + 0.22, block.y + 0.55, block.w - 0.44, block.h - 0.7, 850, '374151'));
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_W}" cy="${SLIDE_H}"/><a:chOff x="0" y="0"/><a:chExt cx="${SLIDE_W}" cy="${SLIDE_H}"/></a:xfrm></p:grpSpPr>${shapes.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function contentTypes(slideCount) {
  const slides = Array.from({ length: slideCount }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${slides}</Types>`;
}

function presentationXml(slideCount) {
  const ids = Array.from({ length: slideCount }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:sldIdLst>${ids}</p:sldIdLst></p:presentation>`;
}

function presentationRels(slideCount) {
  const rels = Array.from({ length: slideCount }, (_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}

function rootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`;
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportPresentationPowerPoint({ enCours = [], valides = [], ranked = [], summary = {} }) {
  const date = new Intl.DateTimeFormat('fr-CH').format(new Date());
  const slides = [
    slideXml('Presentation portefeuille SIPA', `Export genere le ${date}`, [
      { x: 0.55, y: 1.35, w: 2.8, h: 1.2, title: 'En analyse', body: `${enCours.length} biens` },
      { x: 3.65, y: 1.35, w: 2.8, h: 1.2, title: 'Biens valides', body: `${valides.length} biens` },
      { x: 6.75, y: 1.35, w: 2.8, h: 1.2, title: 'Valeur analysee', body: formatCHF(summary.totalValue || 0) },
      { x: 9.85, y: 1.35, w: 2.8, h: 1.2, title: 'Rendement moyen', body: formatPercent(summary.avgNetEquityYield || 0), accent: 'D97706' },
      { x: 0.55, y: 3.0, w: 12.1, h: 2.35, title: 'Lecture portefeuille', body: `Top dossier: ${summary.best?.nom_bien || 'Aucun'}\nFonds propres: ${formatCHF(summary.totalEquity || 0)}\nObjectif: centraliser la lecture des biens, analyses et opportunites commerciales.` },
    ]),
    slideXml('Top opportunites', 'Classement par score puis rendement net / fonds propres', [
      { x: 0.55, y: 1.35, w: 12.1, h: 4.9, title: 'Opportunites prioritaires', body: tableRows(ranked), accent: 'D97706' },
    ]),
    slideXml('Biens valides', 'Dossiers retenus pour validation ou commercialisation', [
      { x: 0.55, y: 1.35, w: 12.1, h: 4.9, title: 'Portefeuille valide', body: tableRows(valides), accent: '059669' },
    ]),
  ];

  const files = [
    { name: '[Content_Types].xml', content: contentTypes(slides.length) },
    { name: '_rels/.rels', content: rootRels() },
    { name: 'ppt/presentation.xml', content: presentationXml(slides.length) },
    { name: 'ppt/_rels/presentation.xml.rels', content: presentationRels(slides.length) },
    ...slides.map((content, index) => ({ name: `ppt/slides/slide${index + 1}.xml`, content })),
  ];

  download(createZip(files), `presentation-sipa-${new Date().toISOString().slice(0, 10)}.pptx`);
}
