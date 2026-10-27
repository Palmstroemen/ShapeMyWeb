"use strict";
const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('node:fs');
const path     = require('node:path');
const vm       = require('node:vm');

const extDir  = path.join(__dirname, '..', 'extension');
const context = vm.createContext({ URL });
for (const file of ['libraries/globalFunctions.js', 'libraries/packages.js']) {
    vm.runInContext(fs.readFileSync(path.join(extDir, file), 'utf8'), context, { filename: file });
}
const packages = JSON.parse(JSON.stringify(vm.runInContext('PACKAGES', context)));
const languages = ['de', 'en', 'it'];

test('es gibt Pakete für Amazon, Temu, YouTube, Google-Suche, soziale Netzwerke und Google Maps', () => {
    assert.deepEqual(packages.map(p => p.id), ['amazon', 'temu', 'youtube', 'google-search', 'social', 'google-maps']);
});

test('jedes Paket hat Domains, Erinnerung in allen Sprachen und mindestens zwei Alternativen', () => {
    for (const p of packages) {
        assert.ok(p.title, p.id);
        assert.ok(p.domains.length > 0, p.id);
        for (const d of p.domains) assert.match(d.domain, /^[a-z0-9-]+(\.[a-z0-9-]+)+$/, p.id);
        for (const lang of languages) assert.ok(p.reminder[lang], `${p.id}: Erinnerung ${lang}`);
        assert.ok(p.alternatives.length >= 2, p.id);
    }
});

test('jede Alternative hat eine https-Adresse, einen Namen und einen Satz in allen Sprachen', () => {
    for (const p of packages) {
        for (const a of p.alternatives) {
            assert.match(a.url, /^https:\/\//, `${p.id}: ${a.url}`);
            assert.ok(a.name, a.url);
            for (const lang of languages) assert.ok(a.claim[lang], `${a.url}: Satz ${lang}`);
            for (const r of a.regions ?? []) assert.match(r, /^[A-Z]{2}$/, a.url);
        }
    }
});

test('Amazon und Temu haben dieselben Alternativen', () => {
    const byId = id => packages.find(p => p.id === id);
    assert.deepEqual(byId('temu').alternatives, byId('amazon').alternatives);
});

test('Google-Pakete sperren nur Suche bzw. Maps, nicht ganz Google (Gmail, Docs ...)', () => {
    for (const id of ['google-search', 'google-maps']) {
        for (const d of packages.find(p => p.id === id).domains) {
            assert.ok(d.subDomains.length > 0, `${id}: ${d.domain} würde ganz gesperrt`);
        }
    }
});

test('Vorauswahl der Alternativen richtet sich nach der Region', () => {
    const preselected = vm.runInContext('preselected', context);
    const amazon = packages.find(p => p.id === 'amazon');
    const urls = regions => amazon.alternatives.filter(a => preselected(a, regions)).map(a => a.url);
    assert.ok(urls(['AT']).every(u => amazon.alternatives.find(a => a.url === u).regions?.includes('AT') ?? true));
    assert.ok(urls(['AT']).length > 0 && urls(['DE']).length > 0);
    assert.notDeepEqual(urls(['AT']), urls(['DE']));
});

test('Region wird aus den Spracheinstellungen abgeleitet', () => {
    const regionsFor = vm.runInContext('regionsFor', context);
    assert.deepEqual(JSON.parse(JSON.stringify(regionsFor(['de-AT', 'en-US']))), ['AT', 'US']);
    assert.deepEqual(JSON.parse(JSON.stringify(regionsFor(['de']))), ['AT', 'DE']);
    assert.deepEqual(JSON.parse(JSON.stringify(regionsFor(['en']))), []);
});

test('Paket-Titel werden pro Sprache angezeigt, Markennamen bleiben gleich', () => {
    const localized = vm.runInContext('localized', context);
    const title = id => packages.find(p => p.id === id).title;
    assert.equal(localized(title('amazon'), 'de'), 'Amazon');
    assert.equal(localized(title('google-search'), 'de'), 'Google-Suche');
    assert.equal(localized(title('google-search'), 'fr'), 'Google Search');
});
