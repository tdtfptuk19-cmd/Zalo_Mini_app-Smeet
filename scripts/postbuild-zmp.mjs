import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const pagesDir = path.join(distDir, 'pages');

const appConfigSource = path.join(rootDir, 'app-config.json');
const appConfigDest = path.join(distDir, 'app-config.json');

if (!fs.existsSync(distDir)) {
  console.error('[postbuild-zmp] dist/ not found. Run vite build first.');
  process.exit(1);
}

fs.mkdirSync(pagesDir, { recursive: true });

if (fs.existsSync(appConfigSource)) {
  fs.copyFileSync(appConfigSource, appConfigDest);
}

const zmpPageHtml = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#0068FF" />
    <title>Smeet - Lịch Họp & Ý Kiến</title>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
`;

fs.writeFileSync(path.join(pagesDir, 'index.html'), zmpPageHtml, 'utf8');

const rootIndexPath = path.join(distDir, 'index.html');
if (fs.existsSync(rootIndexPath)) {
  let rootHtml = fs.readFileSync(rootIndexPath, 'utf8');
  rootHtml = rootHtml.replace(
    /<script type="module" crossorigin src="\.\/assets\/index\.js"><\/script>/,
    '<script crossorigin src="./assets/index.js"></script>'
  );
  fs.writeFileSync(rootIndexPath, rootHtml, 'utf8');
}

console.log('[postbuild-zmp] Created dist/pages/index.html for ZMP deploy');
console.log('[postbuild-zmp] Copied app-config.json to dist/');
