// Smoke-Test für Firefox: installiert die Extension temporär und spielt die Hauptabläufe durch.
// Aufruf: npm run test:e2e:firefox   (FIREFOX_PATH setzen, falls Firefox woanders liegt)
//
// Eigenheiten von Firefox über WebDriver BiDi:
// - Extension-Seiten sind privilegiert: Firefox braucht -remote-allow-system-access.
// - page.url() bleibt nach einer Umleitung auf moz-extension:// veraltet, daher location.href.
// - Navigationen auf Extension-Seiten melden kein "load" an Puppeteer, daher kurze Timeouts.
"use strict";
const puppeteer = require('puppeteer-core');
const http = require('node:http');
const path = require('node:path');

const extDir      = path.join(__dirname, '..', '..', 'extension');
const firefoxPath = process.env.FIREFOX_PATH || '/usr/lib/firefox/firefox';
const addonId     = 'shapemyweb@palmstroemen.github.io';
const uuid        = '11111111-2222-3333-4444-555555555555';
const extUrl      = `moz-extension://${uuid}/`;
const errors = [];
const log    = (...a) => console.log('•', ...a);
const sleep  = ms => new Promise(r => setTimeout(r, ms));

function check(condition, message) {
    if (!condition) throw new Error(message);
}

function watch(page, name) {
    page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
}

const urlOf  = page => page.evaluate(() => location.href);
const openExtensionPage = (page, file) => page.goto(extUrl + file, { timeout: 3000 }).catch(() => {});

(async () => {
    const server = http.createServer((req, res) => {
        res.setHeader('content-type', 'text/html');
        res.end(`<title>${req.headers.host}</title><h1>${req.headers.host}${req.url}</h1>`);
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;

    const browser = await puppeteer.launch({
        browser: 'firefox',
        executablePath: firefoxPath,
        headless: true,
        args: ['-remote-allow-system-access'],
        extraPrefsFirefox: {
            'network.dns.forceResolve': '127.0.0.1',   // alle Domains auf den lokalen Server
            'extensions.webextensions.uuids': JSON.stringify({ [addonId]: uuid })
        }
    });
    try {
        log('Installiert:', await browser.installExtension(extDir));
        await sleep(1500);

        // 0. Willkommensseite nach der Installation
        const pages = await browser.pages();
        let welcome;
        for (const p of pages) {
            if ((await urlOf(p).catch(() => '')) === extUrl + 'welcome.html') welcome = p;
        }
        check(welcome, 'Willkommensseite wurde nach der Installation nicht geöffnet');
        watch(welcome, 'welcome');
        log('Willkommensseite:', await welcome.$eval('h1', e => e.textContent));
        log('Inkognito-Status:', await welcome.$eval('#incognitoStatus', e => e.textContent));
        check(await welcome.$eval('#buttonIncognito', b => b.hidden), 'Firefox darf keinen Einstellungen-Button zeigen');

        const remote = await browser.newPage();
        watch(remote, 'setup');
        await openExtensionPage(remote, 'smw-setup.html');
        const send = msg => remote.evaluate(m => chrome.runtime.sendMessage(m), msg);
        await send({ type: 'actualize-AO', avoid: {
            domain: 'example.com', reminder: 'Hier nicht!', avoidLevels: [2, 2, 2, 2],
            alternatives: [{ url: 'http://orf.at/', name: 'orf.at', claim: 'Nachrichten', color: 'hsl(100, 40%, 80%)' }]
        } });

        // 1. Blockieren
        const page = await browser.newPage();
        watch(page, 'showstopper');
        await page.goto(`http://example.com:${port}/artikel`, { timeout: 5000 }).catch(() => {});
        await sleep(2000);
        log('example.com ->', await urlOf(page));
        check((await urlOf(page)).startsWith(extUrl + 'showstopper.html'), 'example.com wurde nicht blockiert');
        check(await page.$eval('#reminder', e => e.textContent) === 'Hier nicht!', 'falscher Reminder');
        check((await page.$$eval('#alternativesArea a', as => as.map(a => a.href)))[0] === 'http://orf.at/', 'Alternative fehlt');

        // 2. Pass-by
        await page.click('#buttonPassby');
        await sleep(1500);
        log('Nach Pass-by ->', await urlOf(page));
        check((await urlOf(page)).startsWith('http://example.com'), 'Pass-by hat nicht navigiert');

        // 2b. Ruhiges Design
        const settings = (await send({ type: 'getSettings' })).settings;
        await send({ type: 'saveSettings', settings: { ...settings, design: 'calm' } });
        await send({ type: 'actualize-AO', avoid: { domain: 'ruhig.at', reminder: 'Lieber etwas Gutes.', avoidLevels: [2, 2, 2, 2],
            alternatives: [{ url: 'http://manufaktur.at/', name: 'manufaktur.at', claim: 'Gute Dinge' }] } });
        const calm = await browser.newPage();
        watch(calm, 'ruhig');
        await calm.goto(`http://ruhig.at:${port}/`, { timeout: 5000 }).catch(() => {});
        await sleep(2000);
        const view = await calm.evaluate(() => ({
            calmVisible: getComputedStyle(document.getElementById('calmView')).display !== 'none',
            reminder:    document.getElementById('calmReminder').textContent,
            cards:       document.querySelectorAll('#calmAlternatives a').length
        }));
        log('Ruhiges Design:', JSON.stringify(view));
        check(view.calmVisible && view.reminder === 'Lieber etwas Gutes.' && view.cards === 1, 'Ruhiges Design fehlerhaft');
        await send({ type: 'saveSettings', settings: { ...settings, design: 'classic' } });

        // 3. Nicht gelistete Seite
        const free = await browser.newPage();
        await free.goto(`http://frei.org:${port}/`);
        log('frei.org ->', await urlOf(free));
        check((await urlOf(free)).startsWith('http://frei.org'), 'frei.org fälschlich blockiert');

        // 4. Editmode
        const edit = await browser.newPage();
        watch(edit, 'editmode');
        await openExtensionPage(edit, `showstopper.html?url=${encodeURIComponent(`http://news.net:${port}/`)}&new=1`);
        await sleep(1500);
        await edit.click('#reminderEntrybox');
        await edit.evaluate(() => { document.getElementById('reminderEntrybox').value = ''; });
        await edit.type('#reminderEntrybox', 'Zu viel Zeit');
        await edit.click('#buttonConfirm');
        await sleep(800);
        // Puppeteer bemerkt in Firefox nicht, wenn sich ein privilegierter Tab schließt: daher über die Extension fragen.
        const openTabs = await remote.evaluate(() => chrome.tabs.query({}).then(tabs => tabs.map(t => t.url)));
        log('Offene Tabs:', openTabs.length, openTabs.filter(u => u.includes('news.net')));
        check(!openTabs.some(u => u.includes('news.net')), 'Tab wurde nach dem Bestätigen nicht geschlossen');
        const saved = (await send({ type: 'getBlacklist' })).blacklist['news.net'];
        log('Gespeichert news.net:', JSON.stringify(saved));
        check(saved?.reminder === 'Zu viel Zeit', 'Eintrag nicht gespeichert');

        // 5. Popup und Setup-Seite
        const popup = await browser.newPage();
        watch(popup, 'popup');
        await openExtensionPage(popup, 'popup.html');
        await sleep(1000);
        check(await popup.$('#buttonR0') !== null, 'Toolbar im Popup fehlt');
        await remote.reload({ timeout: 3000 }).catch(() => {});
        await sleep(500);
        const listed = await remote.$$eval('#domainlist li strong', l => l.map(e => e.textContent));
        log('Setup-Liste:', listed);
        check(listed.includes('example.com') && listed.includes('news.net'), 'Setup-Liste unvollständig');
    } finally {
        await browser.close();
        server.close();
    }
    check(errors.length === 0, 'JS-Fehler in den Seiten:\n  ' + errors.join('\n  '));
    console.log('\nSmoke-Test (Firefox) bestanden.');
})().catch(e => {
    console.error('\nSmoke-Test (Firefox) FEHLGESCHLAGEN:', e.message.split('\n')[0]);
    process.exit(1);
});
