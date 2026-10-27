"use strict";
const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('node:fs');
const path     = require('node:path');

const localesDir = path.join(__dirname, '..', 'extension', '_locales');
const languages  = fs.readdirSync(localesDir);
const messages   = Object.fromEntries(languages.map(lang =>
    [lang, JSON.parse(fs.readFileSync(path.join(localesDir, lang, 'messages.json'), 'utf8'))]));

test('alle Sprachen haben dieselben Schlüssel', () => {
    const reference = Object.keys(messages.en).sort();
    for (const lang of languages) {
        assert.deepEqual(Object.keys(messages[lang]).sort(), reference, `Sprache ${lang}`);
    }
});

test('keine Datei enthält doppelte Schlüssel', () => {
    for (const lang of languages) {
        const text = fs.readFileSync(path.join(localesDir, lang, 'messages.json'), 'utf8');
        const keys = [...text.matchAll(/^\s*"([^"]+)"\s*:\s*\{/gm)].map(m => m[1]);
        assert.deepEqual(keys.filter((k, i) => keys.indexOf(k) !== i), [], `Sprache ${lang}`);
    }
});

test('übersetzte Texte sind nicht einfach englisch geblieben', () => {
    // Texte, die in jeder Sprache gleich sein dürfen
    const sameEverywhere = new Set(['extName', 'L013', 'L029', 'end']);
    for (const lang of languages.filter(l => l !== 'en')) {
        const untranslated = Object.keys(messages.en).filter(key =>
            !sameEverywhere.has(key) && messages[lang][key]?.message === messages.en[key].message);
        assert.deepEqual(untranslated, [], `Sprache ${lang}`);
    }
});

test('Beschreibung für den Store ist höchstens 132 Zeichen lang', () => {
    for (const lang of languages) {
        const description = messages[lang].extDescription?.message ?? '';
        assert.ok(description.length > 0 && description.length <= 132, `Sprache ${lang}: ${description.length} Zeichen`);
    }
});

test('jedes lang-Attribut in den Seiten hat eine Übersetzung', () => {
    const extDir = path.join(localesDir, '..');
    for (const file of fs.readdirSync(extDir).filter(f => f.endsWith('.html'))) {
        const html = fs.readFileSync(path.join(extDir, file), 'utf8');
        for (const [, key] of html.matchAll(/\blang=['"]([A-Z]\d+)['"]/g)) {
            assert.ok(messages.en[key], `${file}: ${key} fehlt in en`);
        }
    }
});
