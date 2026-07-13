import * as CFB from 'cfb';
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

function createZip(files) {
  const container = CFB.utils.cfb_new();
  files.forEach(({ name, content }) => {
    CFB.utils.cfb_add(container, name, new TextEncoder().encode(content), { unsafe: true });
  });

  const data = CFB.write(container, { type: 'array', fileType: 'zip' });
  return new Blob([new Uint8Array(data)], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
}

function shape(id, x, y, w, h, fill = '111111', line = '111111') {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="${line}"/></a:solidFill></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`;
}

function paragraphs(text, size, color, bold) {
  return String(text ?? '')
    .split('\n')
    .map((line) => `<a:p><a:r><a:rPr lang="fr-CH" sz="${size}" ${bold ? 'b="1"' : ''}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>${esc(line || ' ')}</a:t></a:r></a:p>`)
    .join('');
}

function textBox(id, text, x, y, w, h, size = 1800, color = '1F2937', bold = false) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${paragraphs(text, size, color, bold)}</p:txBody></p:sp>`;
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
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides}</Types>`;
}

function presentationXml(slideCount) {
  const ids = Array.from({ length: slideCount }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rIdMaster1"/></p:sldMasterIdLst><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;
}

function presentationRels(slideCount) {
  const rels = Array.from({ length: slideCount }, (_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}<Relationship Id="rIdMaster1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/></Relationships>`;
}

function rootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`;
}

function slideRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;
}

function slideMasterXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_W}" cy="${SLIDE_H}"/><a:chOff x="0" y="0"/><a:chExt cx="${SLIDE_W}" cy="${SLIDE_H}"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;
}

function slideMasterRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`;
}

function slideLayoutXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_W}" cy="${SLIDE_H}"/><a:chOff x="0" y="0"/><a:chExt cx="${SLIDE_W}" cy="${SLIDE_H}"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
}

function slideLayoutRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;
}

function themeXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="SIPA"><a:themeElements><a:clrScheme name="SIPA"><a:dk1><a:srgbClr val="111111"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F2937"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="A5D63A"/></a:accent1><a:accent2><a:srgbClr val="D97706"/></a:accent2><a:accent3><a:srgbClr val="059669"/></a:accent3><a:accent4><a:srgbClr val="2563EB"/></a:accent4><a:accent5><a:srgbClr val="7C3AED"/></a:accent5><a:accent6><a:srgbClr val="DC2626"/></a:accent6><a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
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
    { name: 'ppt/slideMasters/slideMaster1.xml', content: slideMasterXml() },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', content: slideMasterRels() },
    { name: 'ppt/slideLayouts/slideLayout1.xml', content: slideLayoutXml() },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', content: slideLayoutRels() },
    { name: 'ppt/theme/theme1.xml', content: themeXml() },
    ...slides.map((content, index) => ({ name: `ppt/slides/slide${index + 1}.xml`, content })),
    ...slides.map((_, index) => ({ name: `ppt/slides/_rels/slide${index + 1}.xml.rels`, content: slideRels() })),
  ];

  download(createZip(files), `presentation-sipa-${new Date().toISOString().slice(0, 10)}.pptx`);
}
