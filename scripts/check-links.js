// Prüft, ob alle Alternativen der Schnellstart-Pakete erreichbar sind.
// Aufruf: npm run check-links   (vor jedem Release)
"use strict";
const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');

const context = vm.createContext({ URL });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'extension', 'libraries', 'packages.js'), 'utf8'), context);
const packages = vm.runInContext('PACKAGES', context);
const urls = [...new Set(packages.flatMap(p => p.alternatives.map(a => a.url)))];

async function check(url) {
    try {
        const response = await fetch(url, {
            redirect: 'follow',
            signal: AbortSignal.timeout(15000),
            headers: { 'user-agent': 'Mozilla/5.0 (ShapeMyWeb link check)' }
        });
        return { url, ok: response.status < 400, status: response.status, final: response.url };
    } catch (error) {
        return { url, ok: false, status: error.name };
    }
}

(async () => {
    const results = await Promise.all(urls.map(check));
    for (const r of results) {
        const moved = r.final && r.final !== r.url ? `  → ${r.final}` : '';
        console.log(`${r.ok ? '✓' : '✗'} ${r.status}  ${r.url}${moved}`);
    }
    const failed = results.filter(r => !r.ok);
    if (failed.length) {
        console.error(`\n${failed.length} Adresse(n) nicht erreichbar.`);
        process.exit(1);
    }
    console.log(`\nAlle ${results.length} Adressen erreichbar.`);
})();
