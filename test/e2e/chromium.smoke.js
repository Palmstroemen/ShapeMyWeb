// Smoke-Test: lädt die Extension in Chromium und spielt die Hauptabläufe durch.
// Aufruf: npm run test:e2e   (CHROME_PATH setzen, falls Chromium woanders liegt)
// Dauert ca. eine Minute, weil am Ende gewartet wird, bis Chromium den
// Service Worker wegen Leerlaufs beendet.
"use strict";
const puppeteer = require('puppeteer-core');
const http = require('node:http');
const path = require('node:path');

const extDir     = path.join(__dirname, '..', '..', 'extension');
const chromePath = process.env.CHROME_PATH || '/usr/bin/chromium';
const errors = [];
const log    = (...a) => console.log('•', ...a);
const sleep  = ms => new Promise(r => setTimeout(r, ms));

function check(condition, message) {
    if (!condition) throw new Error(message);
}

function watch(page, name) {
    page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
    page.on('console', m => {
        // Favicons von duckduckgo laufen in der Testumgebung ins Leere.
        if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`${name}: ${m.text()}`);
    });
}

(async () => {
    // Alle Domains zeigen auf diesen lokalen Server.
    const server = http.createServer((req, res) => {
        res.setHeader('content-type', 'text/html');
        res.end(`<title>${req.headers.host}</title><h1>${req.headers.host}${req.url}</h1>`);
    }).listen(0);
    const port = server.address().port;

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: true,
        args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`,
               `--host-resolver-rules=MAP * 127.0.0.1:${port}`, '--no-sandbox'],
    });
    try {
        const swTarget = await browser.waitForTarget(t => t.type() === 'service_worker', { timeout: 10000 });
        const extUrl   = `chrome-extension://${new URL(swTarget.url()).host}/`;
        log('Service Worker läuft:', swTarget.url());

        // Eine Extension-Seite dient als Fernbedienung für Messages an den Background.
        const remote = await browser.newPage();
        watch(remote, 'setup');
        await remote.goto(extUrl + 'smw-setup.html');
        const send = msg => remote.evaluate(m => chrome.runtime.sendMessage(m), msg);
        const blacklist = async () => (await send({ type: 'getBlacklist' })).blacklist;

        await send({ type: 'actualize-AO', avoid: {
            domain: 'example.com', reminder: 'Hier nicht!', avoidLevels: [2, 2, 2, 2],
            alternatives: [{ url: 'http://orf.at/', name: 'orf.at', claim: 'Nachrichten', color: 'hsl(100, 40%, 80%)' }]
        } });

        // 1. Blockieren
        const page = await browser.newPage();
        watch(page, 'showstopper');
        await page.goto(`http://example.com:${port}/artikel`).catch(() => {});
        await sleep(1500);
        log('example.com ->', page.url());
        check(page.url().startsWith(extUrl + 'showstopper.html'), 'example.com wurde nicht blockiert');
        const reminder = await page.$eval('#reminder', e => e.textContent);
        log('Reminder:', reminder);
        check(reminder === 'Hier nicht!', 'falscher Reminder');
        const alternatives = await page.$$eval('#alternativesArea a', as => as.map(a => a.href));
        log('Alternativen:', alternatives);
        check(alternatives[0] === 'http://orf.at/', 'Alternative fehlt');

        // 2. Nicht gelistete Seite
        const free = await browser.newPage();
        await free.goto(`http://frei.org:${port}/`);
        await sleep(500);
        log('frei.org ->', free.url());
        check(free.url().startsWith('http://frei.org'), 'frei.org fälschlich blockiert');
        await free.close();

        // 3. Pass-by
        await page.click('#buttonPassby');
        await sleep(1500);
        log('Nach Pass-by ->', page.url());
        check(page.url().startsWith('http://example.com'), 'Pass-by hat nicht navigiert');

        // 4. Neue Seite vermeiden (Editmode) und bestätigen
        const edit = await browser.newPage();
        watch(edit, 'editmode');
        await edit.goto(`${extUrl}showstopper.html?url=${encodeURIComponent(`http://news.net:${port}/`)}&new=1`);
        await sleep(1500);
        await edit.click('#reminderEntrybox');
        await edit.evaluate(() => { document.getElementById('reminderEntrybox').value = ''; });
        await edit.type('#reminderEntrybox', 'Zu viel Zeit');
        await edit.click('#buttonConfirm');
        await sleep(800);
        const saved = (await blacklist())['news.net'];
        log('Gespeichert news.net:', JSON.stringify(saved));
        check(saved?.reminder === 'Zu viel Zeit', 'Eintrag nicht gespeichert');

        // 5. Popup und Setup-Seite
        const popup = await browser.newPage();
        watch(popup, 'popup');
        await popup.goto(extUrl + 'popup.html');
        await sleep(1000);
        check(await popup.$('#buttonR0') !== null, 'Toolbar im Popup fehlt');
        await remote.reload();
        await sleep(500);
        const listed = await remote.$$eval('#domainlist li strong', l => l.map(e => e.textContent));
        log('Setup-Liste:', listed);
        check(listed.includes('example.com') && listed.includes('news.net'), 'Setup-Liste unvollständig');

        // 6. Blockieren funktioniert auch, nachdem Chromium den Service Worker beendet hat
        await send({ type: 'actualize-AO', avoid: { domain: 'spiel.de', reminder: 'Später!', avoidLevels: [3, 3, 3, 3] } });
        for (const p of await browser.pages()) await p.close();
        const cdp = await browser.target().createCDPSession();
        const workers = async () => (await cdp.send('Target.getTargets')).targetInfos.filter(t => t.type === 'service_worker').length;
        for (let s = 0; s < 90 && await workers() > 0; s += 5) await sleep(5000);
        log('Service Worker nach Leerlauf beendet:', await workers() === 0);
        const again = await browser.newPage();
        await again.goto(`http://spiel.de:${port}/`).catch(() => {});
        await sleep(2000);
        log('spiel.de nach Neustart ->', again.url());
        check(again.url().includes('showstopper.html'), 'nach Neustart des Service Workers nicht blockiert');
    } finally {
        await browser.close();
        server.close();
    }
    check(errors.length === 0, 'JS-Fehler in den Seiten:\n  ' + errors.join('\n  '));
    console.log('\nSmoke-Test bestanden.');
})().catch(e => {
    console.error('\nSmoke-Test FEHLGESCHLAGEN:', e.message);
    process.exit(1);
});
