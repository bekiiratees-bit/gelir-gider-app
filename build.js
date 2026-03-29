const fs = require('fs');
const path = require('path');

const dir = '/Users/bekirates/.gemini/antigravity/scratch/gelir-gider-app';
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(dir, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
const lucide = fs.readFileSync(path.join(dir, 'lucide.min.js'), 'utf8');

// Also load the icon and convert to base64
const icon = fs.readFileSync(path.join(dir, 'app_icon_512.png'));
const iconBase64 = `data:image/png;base64,${icon.toString('base64')}`;

// Inject CSS and JS
let newHtml = html.replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`);
newHtml = newHtml.replace('<script src="app.js"></script>', `<script>\n${js}\n</script>`);

// Inject local Lucide icons inside the monolithic build
newHtml = newHtml.replace(
  '<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>',
  `<script>\n${lucide}\n</script>`
);

// Replace header icon logos with base64 embedded icon
newHtml = newHtml.replace(/<img src="app_icon_512\.png"/g, `<img src="${iconBase64}"`);

// Replace Apple Touch Icon link with base64
newHtml = newHtml.replace('<link rel="apple-touch-icon" href="app_icon_512.png">', `<link rel="apple-touch-icon" href="${iconBase64}">`);

// Remove Manifest and Service Worker because they don't work natively for local file:// URIs on iOS
newHtml = newHtml.replace('<link rel="manifest" href="manifest.json">', '');
newHtml = newHtml.replace(/<script>\s*if \('serviceWorker' in navigator\)(.|\n)*?<\/script>/g, '');

const outPath = path.join(dir, 'GelirGider.html');
fs.writeFileSync(outPath, newHtml);
console.log('Successfully created monolithic build:', outPath);
