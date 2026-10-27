"use strict";
const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { loadBackground, extensionUrl } = require('./fakeChrome');

const showstopper = extensionUrl + 'showstopper.html';

async function avoid(bg, domain, entry = {}) {
    await bg.send({ type: 'actualize-AO', avoid: {
        domain, reminder: 'nicht hier', avoidLevels: [2, 2, 2, 2], subDomains: [], alternatives: [], ...entry
    } });
}

// Hilfsfunktionen ..........................................................

test('splitUrl liefert Hauptdomain und lesbare Teilbereiche', () => {
    const splitUrl = loadBackground().call('splitUrl');
    assert.deepEqual(JSON.parse(JSON.stringify(splitUrl('https://www.derstandard.at/story/2000123/eine-sehr-lange-ueberschrift'))),
                     ['derstandard.at', ['story']]);
    assert.equal(splitUrl('https://www.tuwien.ac.at/')[0], 'tuwien.ac.at');
    assert.deepEqual(Array.from(splitUrl('https://shop.example.com/')[1]), ['shop']);
    assert.equal(splitUrl('kein url')[0], '');
});

test('isWebUrl akzeptiert nur http(s)', () => {
    const isWebUrl = loadBackground().call('isWebUrl');
    assert.equal(isWebUrl('https://example.com'), true);
    assert.equal(isWebUrl('http://example.com'), true);
    assert.equal(isWebUrl('javascript:alert(1)'), false);
    assert.equal(isWebUrl('chrome://settings'), false);
    assert.equal(isWebUrl(undefined), false);
});

test('escapeHtml entschärft HTML', () => {
    const escapeHtml = loadBackground().call('escapeHtml');
    assert.equal(escapeHtml(`<img src=x onerror="a">'`), '&lt;img src=x onerror=&quot;a&quot;&gt;&#39;');
    assert.equal(escapeHtml(undefined), '');
});

// Blockieren ...............................................................

test('nicht gelistete Seiten werden nicht blockiert', async () => {
    const bg = loadBackground();
    assert.deepEqual(await bg.navigate('https://example.com/'), []);
});

test('gelistete Seite wird auf den ShowStopper umgeleitet', async () => {
    const bg = loadBackground();
    await avoid(bg, 'youtube.com');
    const updates = await bg.navigate('https://www.youtube.com/watch?v=1', 7);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].tabId, 7);
    assert.equal(updates[0].url, showstopper + '?url=' + encodeURIComponent('https://www.youtube.com/watch?v=1'));
});

test('Unterframes und eigene Seiten werden ignoriert', async () => {
    const bg = loadBackground();
    await avoid(bg, 'youtube.com');
    assert.deepEqual(await bg.navigate('https://youtube.com/', 7, 3), []);
    assert.deepEqual(await bg.navigate(showstopper + '?url=x'), []);
});

test('Avoid-Level 0 der aktiven Rolle blockiert nicht', async () => {
    const bg = loadBackground();
    await avoid(bg, 'youtube.com', { avoidLevels: [0, 3, 3, 3] });
    await bg.send({ type: 'setRole', role: 0 });
    assert.deepEqual(await bg.navigate('https://youtube.com/'), []);
    await bg.send({ type: 'setRole', role: 1 });
    assert.equal((await bg.navigate('https://youtube.com/')).length, 1);
});

test('setRole speichert die NEUE Rolle', async () => {
    const bg = loadBackground();
    await bg.send({ type: 'setRole', role: 2 });
    assert.equal((await bg.send({ type: 'getRole' })).role, 2);
});

test('Avoid-Level 1 warnt höchstens einmal pro Minute', async () => {
    const bg = loadBackground();
    await avoid(bg, 'youtube.com', { avoidLevels: [1, 1, 1, 1] });
    assert.equal((await bg.navigate('https://youtube.com/')).length, 1);
    assert.equal((await bg.navigate('https://youtube.com/')).length, 0);
});

test('Subdomain-Einträge blockieren nur diese Bereiche', async () => {
    const bg = loadBackground();
    await avoid(bg, 'derstandard.at', { subDomains: ['story'] });
    assert.equal((await bg.navigate('https://www.derstandard.at/story/123')).length, 1);
    assert.equal((await bg.navigate('https://www.derstandard.at/wissenschaft')).length, 0);
});

test('Pause setzt das Blockieren aus, unpause beendet sie', async () => {
    const bg = loadBackground();
    await avoid(bg, 'youtube.com');
    await bg.send({ type: 'pause' });
    assert.equal((await bg.send({ type: 'paused?' })).paused, true);
    assert.deepEqual(await bg.navigate('https://youtube.com/'), []);
    await bg.send({ type: 'unpause' });
    assert.equal((await bg.send({ type: 'paused?' })).paused, false);
    assert.equal((await bg.navigate('https://youtube.com/')).length, 1);
});

test('pass-by lässt die Seite durch und lädt sie im Tab', async () => {
    const bg = loadBackground();
    await avoid(bg, 'youtube.com');
    await bg.send({ type: 'pass-by!', url: 'https://youtube.com/x' }, { tab: { id: 9 } });
    assert.deepEqual(bg.tabs.updates.at(-1), { tabId: 9, url: 'https://youtube.com/x' });
    assert.deepEqual(await bg.navigate('https://youtube.com/x'), []);
});

test('pass-by und unavoid laden keine javascript:-URLs', async () => {
    const bg = loadBackground();
    await bg.send({ type: 'pass-by!', url: 'javascript:alert(1)' }, { tab: { id: 9 } });
    await bg.send({ type: 'unavoid-site', url: 'javascript:alert(1)', avoidDomain: 'x.com' }, { tab: { id: 9 } });
    assert.deepEqual(bg.tabs.updates, []);
});

test('unavoid gibt die Seite frei, merkt sich aber Levels und Alternativen', async () => {
    const bg = loadBackground();
    const alternatives = [{ url: 'https://orf.at', name: 'orf.at' }];
    await avoid(bg, 'youtube.com', { avoidLevels: [3, 2, 1, 0], alternatives });
    await bg.send({ type: 'unavoid-site', url: 'https://youtube.com/' }, { tab: { id: 4 } });

    assert.deepEqual(await bg.navigate('https://youtube.com/'), []);
    const ans = await bg.send({ type: 'whom-do-I-avoid?', url: 'https://youtube.com/', isNew: true });
    assert.equal(ans.AO.reminder, 'new');
    assert.deepEqual(ans.AO.avoidLevels, [3, 2, 1, 0]);
    assert.deepEqual(ans.AO.alternatives, alternatives);
});

// Messages .................................................................

test('avoid-site öffnet den ShowStopper im Editmode', async () => {
    const bg = loadBackground();
    await bg.send({ type: 'avoid-site', url: 'https://example.com/', tabId: 3 });
    assert.deepEqual(bg.tabs.updates, [{
        tabId: 3, url: showstopper + '?url=' + encodeURIComponent('https://example.com/') + '&new=1'
    }]);
});

test('whom-do-I-avoid? liefert AO, Rolle und Settings und löscht den Verlaufseintrag', async () => {
    const bg = loadBackground();
    await avoid(bg, 'youtube.com');
    const pageUrl = showstopper + '?url=x';
    const ans = await bg.send({ type: 'whom-do-I-avoid?', url: 'https://youtube.com/' }, { url: pageUrl });
    assert.equal(ans.AO.domain, 'youtube.com');
    assert.equal(ans.AO.reminder, 'nicht hier');
    assert.equal(ans.role, 0);
    assert.equal(ans.settings.pauseTime, 10);
    assert.deepEqual(bg.chrome.history.deleted, [pageUrl]);
});

test('Neues AO für eine unbekannte Seite hat leere Subdomains und Alternativen', async () => {
    const bg = loadBackground();
    const ans = await bg.send({ type: 'whom-do-I-avoid?', url: 'https://example.com/a', isNew: true });
    assert.deepEqual(ans.AO.subDomains, []);
    assert.deepEqual(ans.AO.alternatives, []);
    assert.deepEqual(ans.AO.avoidLevels, [1, 1, 1, 1]);
});

test('is-this-tab-avoided? sieht durch den ShowStopper auf die blockierte Seite', async () => {
    const bg = loadBackground();
    await avoid(bg, 'youtube.com');
    const tab = { id: 1, url: showstopper + '?url=' + encodeURIComponent('https://youtube.com/') };
    const ans = await bg.send({ type: 'is-this-tab-avoided?', tab });
    assert.equal(ans.AO.avoided, true);
    assert.equal(ans.AO.url, 'https://youtube.com/');
});

test('actualize-AO repariert kaputte Alternativen ({} statt [])', async () => {
    const bg = loadBackground();
    await avoid(bg, 'diepresse.com', { alternatives: {} });
    const { blacklist } = await bg.send({ type: 'getBlacklist' });
    assert.deepEqual(blacklist['diepresse.com'].alternatives, []);
});

test('jeder Blacklist-Eintrag liegt unter einem eigenen Schlüssel', async () => {
    const bg = loadBackground();
    await avoid(bg, 'a.com');
    await avoid(bg, 'b.com');
    assert.deepEqual(Object.keys(bg.chrome.storage.sync.data).sort(), ['bl:a.com', 'bl:b.com']);
});

test('setAvoidLevels ändert nur bestehende Einträge', async () => {
    const bg = loadBackground();
    await avoid(bg, 'a.com');
    await bg.send({ type: 'setAvoidLevels', avoidDomain: 'a.com', avoidLevels: [3, 3, 3, 3] });
    await bg.send({ type: 'setAvoidLevels', avoidDomain: 'neu.com', avoidLevels: [3, 3, 3, 3] });
    const { blacklist } = await bg.send({ type: 'getBlacklist' });
    assert.deepEqual(blacklist['a.com'].avoidLevels, [3, 3, 3, 3]);
    assert.equal(blacklist['neu.com'], undefined);
});

test('Settings werden gespeichert und mit Defaults geladen', async () => {
    const bg = loadBackground();
    const defaults = (await bg.send({ type: 'getSettings' })).settings;
    assert.deepEqual(defaults.showRole, [true, true, true, true]);
    await bg.send({ type: 'saveSettings', settings: { ...defaults, pauseTime: 25, textOpacity: 0 } });
    const saved = (await bg.send({ type: 'getSettings' })).settings;
    assert.equal(saved.pauseTime, 25);
    assert.equal(saved.textOpacity, 0);
    assert.equal(bg.chrome.storage.local.data.pauseTime, 25);
});

test('unbekannte Messages bleiben für andere Seiten der Extension', async () => {
    const bg = loadBackground();
    assert.equal(await bg.send({ type: 'are-you-avoided?' }), 'not handled');
});

test('setup öffnet die Setup-Seite in einem neuen Tab', async () => {
    const bg = loadBackground();
    await bg.send({ type: 'setup' });
    assert.deepEqual(bg.tabs.created, [extensionUrl + 'smw-setup.html']);
});

// Migration ................................................................

test('Update migriert die alte Blacklist aus Version 0.2', async () => {
    const bg = loadBackground();
    await bg.chrome.storage.sync.set({ blackList: {
        'derstandard.at': { reminder: 'bunt', subDomains: ['story'], avoidLevels: [0, 1, 2, 3], alternatives: [] },
        'diepresse.com':  { reminder: 'konservativ', subDomains: [], avoidLevels: [0, 1, 2, 3], alternatives: {} },
        'youtube7.com':   { reminder: 'demo', subDomains: [], avoidLevels: [0, 1, 2, 3], alternatives: [] }
    } });
    await bg.chrome.runtime.onInstalled.listeners[0]({ reason: 'update' });

    const data = bg.chrome.storage.sync.data;
    assert.equal(data.blackList, undefined);
    assert.deepEqual(Object.keys(data).sort(), ['bl:derstandard.at', 'bl:diepresse.com']);
    assert.deepEqual(data['bl:diepresse.com'].alternatives, []);
});

test('Omnibox "avoid" öffnet den Editmode für den aktuellen Tab', async () => {
    const bg = loadBackground();
    await bg.chrome.omnibox.onInputEntered.listeners[0]('');
    assert.equal(bg.tabs.updates[0].tabId, 1);
    assert.match(bg.tabs.updates[0].url, /&new=1$/);
});
