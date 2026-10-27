// Smoke-Test: lädt die Extension in Chromium und spielt die Hauptabläufe durch.
// Aufruf: npm run test:e2e   (CHROME_PATH setzen, falls Chromium woanders liegt)
// Dauert ca. eine Minute, weil am Ende gewartet wird, bis Chromium den
// Service Worker wegen Leerlaufs beendet.
"use strict";
const puppeteer = require('puppeteer-core');
const http = require('node:http');
const path = require('node:path');
const fs   = require('node:fs');
const os   = require('node:os');

const extDir     = path.join(__dirname, '..', '..', 'extension');
const chromePath = process.env.CHROME_PATH || '/usr/bin/chromium';
const errors = [];
const log    = (...a) => console.log('•', ...a);
const sleep  = ms => new Promise(r => setTimeout(r, ms));

function check(condition, message) {
    if (!condition) throw new Error(message);
}

async function clickAt(page, selector) {
    // page.click() hängt auf der Setup-Seite (Puppeteer); ein echter Mausklick funktioniert.
    await page.$eval(selector, e => e.scrollIntoView({ block: 'center' }));
    const box = await (await page.$(selector)).boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
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
        env: { ...process.env, LANGUAGE: 'de' },   // Platzhalter im HTML sind englisch
        args: ['--lang=de', `--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`,
               `--host-resolver-rules=MAP * 127.0.0.1:${port}`, '--no-sandbox'],
    });
    try {
        const swTarget = await browser.waitForTarget(t => t.type() === 'service_worker', { timeout: 10000 });
        const extUrl   = `chrome-extension://${new URL(swTarget.url()).host}/`;
        log('Service Worker läuft:', swTarget.url());

        // 0. Willkommensseite nach der Installation
        const welcomeTarget = await browser.waitForTarget(t => t.url() === extUrl + 'welcome.html', { timeout: 5000 }).catch(() => null);
        check(welcomeTarget, 'Willkommensseite wurde nach der Installation nicht geöffnet');
        const welcome = await welcomeTarget.page();
        watch(welcome, 'welcome');
        await welcome.reload();
        await sleep(500);
        const welcomeTitle = await welcome.$eval('h1', e => e.textContent);
        log('Willkommensseite:', welcomeTitle);
        check(welcomeTitle === 'Willkommen bei ShapeMyWeb!', 'Willkommensseite nicht übersetzt');
        log('Inkognito-Status:', await welcome.$eval('#incognitoStatus', e => e.textContent));
        check(await welcome.$('a[href^="smw-setup.html"]') !== null, 'Willkommensseite verweist nicht auf die Pakete');

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
        const icon = await page.$eval('#alternativesArea img.icon', e => e.getAttribute('src'));
        log('Icon der Alternative:', icon);
        check(icon === 'https://orf.at/favicon.ico', 'Icon soll direkt von der Alternative kommen, nicht von einem Drittanbieter');
        // Die Augen sitzen genau auf den beiden O von "DO NOT", egal mit welcher Schrift
        await page.mouse.move(700, 300);
        await sleep(1000);
        const eyeOffsets = await page.evaluate(() => {
            const center = el => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
            const os = [...document.querySelectorAll('#doNot .signO')];
            if (os.length !== 2) return null;
            return [center(document.getElementById('eyeLeft')) - center(os[0]),
                    center(document.getElementById('eyeRight')) - center(os[1])];
        });
        log('Abstand Auge zu O (px):', eyeOffsets);
        check(eyeOffsets && eyeOffsets.every(dx => Math.abs(dx) < 3), 'Augen sitzen nicht auf den O von DO NOT');

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

        // 3b. Ruhiges Design
        const settings = (await send({ type: 'getSettings' })).settings;
        await send({ type: 'saveSettings', settings: { ...settings, design: 'calm' } });
        await send({ type: 'actualize-AO', avoid: {
            domain: 'ruhig.at', reminder: 'Lieber etwas Gutes.', avoidLevels: [2, 2, 2, 2],
            alternatives: [{ url: 'http://manufaktur.at/', name: 'manufaktur.at', claim: 'Gute Dinge', color: 'hsl(30, 50%, 70%)' }]
        } });
        const calm = await browser.newPage();
        watch(calm, 'ruhig');
        await calm.goto(`http://ruhig.at:${port}/`).catch(() => {});
        await sleep(1500);
        const view = await calm.evaluate(() => ({
            calmVisible:    getComputedStyle(document.getElementById('calmView')).display !== 'none',
            classicVisible: getComputedStyle(document.querySelector('.wrapper')).display !== 'none',
            reminder:       document.getElementById('calmReminder')?.textContent,
            domain:         document.getElementById('calmDomain')?.textContent,
            cards:          [...document.querySelectorAll('#calmAlternatives a')].map(a => [a.href, a.textContent]),
            pending:        document.body.classList.contains('pending')
        }));
        log('Ruhiges Design:', JSON.stringify(view));
        check(view.calmVisible && !view.classicVisible, 'Ruhiges Design wird nicht angezeigt');
        check(!view.pending, 'Seite bleibt unsichtbar');
        check(view.reminder === 'Lieber etwas Gutes.' && view.domain === 'ruhig.at', 'Erinnerung oder Domain fehlt');
        check(view.cards.length === 1 && view.cards[0][0] === 'http://manufaktur.at/' && view.cards[0][1].includes('Gute Dinge'), 'Alternative fehlt');
        await calm.click('#calmPassby');
        await sleep(1500);
        log('Ruhig: Trotzdem weiter ->', calm.url());
        check(calm.url().startsWith('http://ruhig.at'), 'Trotzdem weiter funktioniert im ruhigen Design nicht');

        // Umschalter in den Einstellungen
        await calm.goto(extUrl + 'showstopper.html?url=' + encodeURIComponent(`http://ruhig.at:${port}/`));
        await sleep(1500);
        await calm.evaluate(() => document.getElementById('designClassic').click());
        await sleep(300);
        check((await send({ type: 'getSettings' })).settings.design === 'classic', 'Umschalter speichert das Design nicht');
        await calm.reload();
        await sleep(1500);
        check(await calm.evaluate(() => getComputedStyle(document.getElementById('calmView')).display === 'none'),
              'Nach dem Umschalten wird noch das ruhige Design gezeigt');
        await calm.close();

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
        check(edit.isClosed(), 'Tab wurde nach dem Bestätigen nicht geschlossen');
        const saved = (await blacklist())['news.net'];
        log('Gespeichert news.net:', JSON.stringify(saved));
        check(saved?.reminder === 'Zu viel Zeit', 'Eintrag nicht gespeichert');

        // 5. Popup und Setup-Seite
        const popup = await browser.newPage();
        watch(popup, 'popup');
        await popup.goto(extUrl + 'popup.html');
        await sleep(1000);
        check(await popup.$('#buttonR0') !== null, 'Toolbar im Popup fehlt');
        const contact = await popup.$eval('#contactLink', a => [a.href, a.target, a.textContent]).catch(() => null);
        log('Kontakt-Link:', contact);
        check(contact?.[0] === 'https://github.com/Palmstroemen/ShapeMyWeb/issues' && contact[1] === '_blank', 'Kontakt-Link fehlt');
        const tabsBefore = (await browser.pages()).length;
        await popup.click('#buttonHelp');
        const helpTarget = await browser.waitForTarget(t => t.url() === extUrl + 'welcome.html' && t !== welcomeTarget, { timeout: 3000 }).catch(() => null);
        check(helpTarget, 'Hilfe-Button öffnet die Willkommensseite nicht');
        await remote.reload();
        await sleep(500);
        const listed = await remote.$$eval('.entryDomain', l => l.map(e => e.textContent));
        log('Setup-Liste:', listed);
        check(listed.includes('example.com') && listed.includes('news.net'), 'Setup-Liste unvollständig');
        const radios = await remote.evaluate(() => [
            document.getElementById('setupDesignClassic')?.checked,
            document.getElementById('setupDesignCalm')?.checked
        ]);
        log('Setup-Seite, Darstellung (Stoppschild, ruhig):', radios);
        check(radios[0] === true && radios[1] === false, 'Setup-Seite zeigt den Design-Umschalter nicht richtig an');
        await clickAt(remote, '#setupDesignCalm');
        await sleep(300);
        check((await send({ type: 'getSettings' })).settings.design === 'calm', 'Setup-Seite speichert das Design nicht');
        await clickAt(remote, '#setupDesignClassic');
        await sleep(300);

        // 5b. Einstellungsseite: Pakete, Verwaltung, Export und Import
        remote.on('dialog', dialog => dialog.accept());
        const entryOf = async domain => (await blacklist())[domain];
        const setValue = (selector, value) => remote.evaluate((sel, val) => {
            const el = document.querySelector(sel);
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, selector, value);

        const packageIds = await remote.$$eval('.package', l => l.map(e => e.dataset.package));
        log('Pakete:', packageIds);
        check(packageIds.length === 6 && packageIds.includes('temu'), 'Pakete fehlen auf der Einstellungsseite');
        const toggle = '[data-package="temu"] input.packageToggle';
        check(!(await remote.$eval(toggle, e => e.checked)), 'Temu-Paket ist schon an');
        await clickAt(remote, '[data-package="temu"] .packageDetails');
        await sleep(300);
        const choices = await remote.$$eval('[data-package="temu"] input.packageAlt', l => l.map(e => [e.value, e.checked]));
        log('Temu, Vorauswahl:', JSON.stringify(choices));
        check(choices.length === 4 && choices.every(c => c[1]), 'Vorauswahl des Temu-Pakets falsch (Sprache de: alle)');
        await clickAt(remote, '[data-package="temu"] input.packageAlt[value="https://www.genialokal.de/"]');
        await sleep(300);
        check((await entryOf('temu.com')) === undefined, 'Paket ist aus, darf noch nichts speichern');
        await clickAt(remote, toggle);
        await sleep(600);
        let temu = await entryOf('temu.com');
        log('Temu eingeschaltet:', temu?.reminder, temu?.alternatives.map(a => a.name));
        check(temu?.reminder === 'Billig kostet am Ende mehr.' && temu.avoidLevels.join() === '1,1,1,1'
              && temu.alternatives.length === 3 && !temu.alternatives.some(a => a.url.includes('genialokal')),
              'Temu-Paket falsch gespeichert');
        check(await remote.$eval('#savedNotice', e => e.classList.contains('visible')), 'Keine Bestätigung "Gespeichert"');

        // Beim nächsten Aufruf ist der Schalter noch an
        await remote.reload();
        await sleep(800);
        check(await remote.$eval(toggle, e => e.checked), 'Paket nach dem Neuladen nicht mehr aktiv');
        await clickAt(remote, '[data-package="temu"] .packageDetails');
        await sleep(300);
        check(!(await remote.$eval('[data-package="temu"] input.packageAlt[value="https://www.genialokal.de/"]', e => e.checked)),
              'Häkchen zeigen nicht den gespeicherten Stand');
        await clickAt(remote, '[data-package="temu"] input.packageAlt[value="https://www.genialokal.de/"]');
        await sleep(600);
        check((await entryOf('temu.com')).alternatives.length === 4, 'Häkchen bei aktivem Paket nicht gespeichert');
        await setValue('[data-package="temu"] .packageReminder', 'Wirklich billig?');
        await sleep(600);
        check((await entryOf('temu.com')).reminder === 'Wirklich billig?', 'Erinnerung bei aktivem Paket nicht gespeichert');

        // Ausschalten gibt die Seite frei, Google-Suche und Maps teilen sich google.com
        await clickAt(remote, toggle);
        await sleep(600);
        check((await entryOf('temu.com')).reminder === undefined, 'Ausschalten gibt die Seite nicht frei');
        await clickAt(remote, '[data-package="google-search"] input.packageToggle');
        await clickAt(remote, '[data-package="google-maps"] input.packageToggle');
        await sleep(800);
        check((await entryOf('google.com')).subDomains.join() === 'search,maps', 'Google-Pakete nicht zusammengeführt');
        await clickAt(remote, '[data-package="google-search"] input.packageToggle');
        await sleep(600);
        const google = await entryOf('google.com');
        log('Google nach Ausschalten der Suche:', google.reminder, google.subDomains);
        check(google.reminder !== undefined && google.subDomains.join() === 'maps', 'Maps soll gesperrt bleiben');
        check(await remote.$eval('[data-package="google-maps"] input.packageToggle', e => e.checked)
              && !(await remote.$eval('[data-package="google-search"] input.packageToggle', e => e.checked)), 'Schalter falsch');

        await setValue('#newDomain', 'kein domain');
        await clickAt(remote, '#addEntry');
        await sleep(200);
        check(await remote.$eval('#newDomainWarning', e => getComputedStyle(e).display !== 'none'), 'Ungültige Domain ohne Warnung');
        await setValue('#newDomain', 'https://www.beispiel.at/irgendwas');
        await setValue('#newReminder', 'Zu teuer.');
        await clickAt(remote, '#addEntry');
        await sleep(500);
        check((await entryOf('beispiel.at'))?.reminder === 'Zu teuer.', 'Seite nicht von Hand hinzugefügt');

        const row = '[data-domain="beispiel.at"]';
        await setValue(`${row} .altUrl`, 'https://gut.at/');
        await setValue(`${row} .altClaim`, 'Besser');
        await clickAt(remote, `${row} .altAdd`);
        await sleep(500);
        check((await entryOf('beispiel.at')).alternatives.some(a => a.url === 'https://gut.at/' && a.claim === 'Besser'), 'Alternative nicht hinzugefügt');
        await clickAt(remote, `${row} .altRemove`);
        await sleep(500);
        check((await entryOf('beispiel.at')).alternatives.length === 0, 'Alternative nicht entfernt');
        await remote.select(`${row} select.level[data-role="0"]`, '3');
        await sleep(400);
        check((await entryOf('beispiel.at')).avoidLevels[0] === 3, 'Störstärke nicht geändert');
        await setValue(`${row} .entryReminder`, 'Viel zu teuer.');
        await sleep(400);
        check((await entryOf('beispiel.at')).reminder === 'Viel zu teuer.', 'Erinnerung nicht geändert');
        await clickAt(remote, `${row} .entryUnavoid`);
        await sleep(500);
        check((await entryOf('beispiel.at')).reminder === undefined, 'Freigeben funktioniert nicht');
        await clickAt(remote, `${row} .entryReavoid`);
        await sleep(500);
        check((await entryOf('beispiel.at')).reminder !== undefined, 'Wieder vermeiden funktioniert nicht');
        await clickAt(remote, `${row} .entryDelete`);
        await sleep(500);
        check((await entryOf('beispiel.at')) === undefined, 'Löschen funktioniert nicht');

        const exported = JSON.parse(await remote.evaluate(() => buildExport()));
        log('Export:', exported.format, Object.keys(exported.entries).length, 'Einträge');
        check(exported.format === 'shapemyweb-list' && exported.entries['temu.com'], 'Export unvollständig');
        const importFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'smw-')), 'liste.json');
        fs.writeFileSync(importFile, JSON.stringify({ format: 'shapemyweb-list', version: 1,
            entries: { 'import.at': { reminder: 'Importiert.', avoidLevels: [2, 2, 2, 2], subDomains: [], alternatives: [] } } }));
        await (await remote.$('#importFile')).uploadFile(importFile);
        await sleep(800);
        log('Import:', await remote.$eval('#importResult', e => e.textContent));
        check((await entryOf('import.at'))?.reminder === 'Importiert.', 'Import funktioniert nicht');
        fs.writeFileSync(importFile, '{"irgendwas": true}');
        await (await remote.$('#importFile')).uploadFile(importFile);
        await sleep(500);
        check(await remote.$eval('#importResult', e => e.classList.contains('error')), 'Ungültige Importdatei ohne Fehlermeldung');

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
