import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const indexPath = resolve(mobileRoot, 'dist/index.html');
const pwaHead = `
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="MOA" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/moa-180.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/moa-192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/icons/moa-512.png" />`;

let html = await readFile(indexPath, 'utf8');
html = html.replace(/<title>[^<]*<\/title>/, '<title>MOA</title>');

if (!html.includes('manifest.webmanifest')) {
  html = html.replace('</head>', `${pwaHead}\n  </head>`);
}

await writeFile(indexPath, html);
