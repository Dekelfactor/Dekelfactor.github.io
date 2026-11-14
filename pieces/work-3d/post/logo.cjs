// Render the original Open Stage Jam logo SVG (from the app's welcome screen) to a transparent PNG, with the app's own red glow.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [svgPath, out, width] = process.argv.slice(2);
  const svg = fs.readFileSync(svgPath, 'utf8').replace(/class="ws-hero-logo"/, 'id="logo"');
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: 1 });
  await p.setContent(`<html><body style="margin:0;background:transparent"><div id="wrap" style="padding:80px;display:inline-block">
    <style>#logo{width:${width}px;height:auto;display:block;filter:drop-shadow(0 0 40px rgba(255,28,56,0.55)) drop-shadow(0 0 12px rgba(255,28,56,0.3));}</style>${svg}</div></body></html>`);
  await p.locator('#wrap').screenshot({ path: out, omitBackground: true });
  await b.close();
})();
