import { JSDOM } from 'jsdom';
import fs from 'node:fs';
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window; globalThis.document = dom.window.document;
try { globalThis.navigator = dom.window.navigator; } catch {}
globalThis.DOMParser = dom.window.DOMParser; globalThis.Element = dom.window.Element;
const { default: mermaid } = await import('mermaid');
mermaid.initialize({ startOnLoad: false });
let n = 0, bad = 0;
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /```mermaid\n([\s\S]*?)```/g; let m;
  while ((m = re.exec(src))) { n++;
    try { await mermaid.parse(m[1]); }
    catch (e) { bad++; console.log(`FAIL ${f} @${src.slice(0,m.index).split('\n').length}: ${String(e.message||e).split('\n').slice(0,3).join(' | ')}`); }
  }
}
console.log(`mermaid blokova: ${n}, neispravnih: ${bad}`); process.exit(bad ? 1 : 0);
