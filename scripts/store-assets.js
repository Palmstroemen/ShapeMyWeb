// Erzeugt Screenshots (1280×800) und die Werbekachel (440×280) für die Stores
// aus der echten Extension in Chromium – für jede Sprache einen Satz.
// Aufruf: npm run store-assets   (CHROME_PATH setzen, falls Chromium woanders liegt)
// Ergebnis: docs/store/<sprache>/
"use strict";
const puppeteer = require('puppeteer-core');
const http = require('node:http');
const fs   = require('node:fs');
const path = require('node:path');

const root       = path.join(__dirname, '..');
const extDir     = path.join(root, 'extension');
const outDir     = path.join(root, 'docs', 'store');
const chromePath = process.env.CHROME_PATH || '/usr/bin/chromium';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shotHeight = 600;   // sichtbarer Ausschnitt der Seiten (Breite 1280)

// Ausgedachte Domains, damit keine echten Marken in den Store-Bildern stehen.
const texts = {
    de: {
        shop: 'megamarkt.com', shopTitle: 'MegaMarkt', shopClaim: 'Alles. Sofort. Überall.',
        reminder: 'Lieber beim Buchhändler ums Eck.',
        alternatives: [
            { url: 'https://buchhandlung-ecke.at/', claim: 'Bücher aus meinem Viertel', color: 'hsl(40, 65%, 82%)' },
            { url: 'https://regionalmarkt.at/', claim: 'Einkaufen in Österreich', color: 'hsl(140, 40%, 80%)' }
        ],
        feed: 'endlosfeed.com', feedPath: '/feed/neu', feedReminder: 'Frisst nur meine Zeit.',
        feedAlternative: { url: 'https://wanderwege.at/', claim: 'Lieber raus in die Natur' },
        captions: [
            ['Dein eigenes Stoppschild', 'Statt der Webseite: deine Erinnerung und bessere Alternativen.'],
            ['Mit zwei Klicks vermeiden', 'Symbol anklicken, Stoppschild anklicken – fertig.'],
            ['Mit deinen eigenen Worten', 'Schreib dir, warum – und wohin du stattdessen willst.'],
            ['In einer Minute eingerichtet', 'Keine Konten, kein Tracking. Deine Daten bleiben bei dir.']
        ],
        tagline: 'Nicht blockieren – umlenken.'
    },
    en: {
        shop: 'megamarket.com', shopTitle: 'MegaMarket', shopClaim: 'Everything. Now. Everywhere.',
        reminder: 'Rather the bookshop around the corner.',
        alternatives: [
            { url: 'https://cornerbookshop.com/', claim: 'Books from my neighbourhood', color: 'hsl(40, 65%, 82%)' },
            { url: 'https://localmarket.com/', claim: 'Shopping close to home', color: 'hsl(140, 40%, 80%)' }
        ],
        feed: 'endlessfeed.com', feedPath: '/feed/new', feedReminder: 'Just eats my time.',
        feedAlternative: { url: 'https://hikingtrails.com/', claim: 'Rather go outside' },
        captions: [
            ['Your own stop sign', 'Instead of the website: your reminder and better alternatives.'],
            ['Avoid a website in two clicks', 'Click the icon, click the stop sign – done.'],
            ['In your own words', 'Write down why – and where you would rather go instead.'],
            ['Set up in a minute', 'No accounts, no tracking. Your data stays with you.']
        ],
        tagline: "Don't just block – redirect."
    }
};


function shopPage(t) {
    // Eine erfundene Shop-Seite als Hintergrund für das Popup.
    const tiles = ['#f6d365', '#a1c4fd', '#fbc2eb', '#c2e9fb', '#d4fc79', '#fda085']
        .map(c => `<div class="tile"><div class="img" style="background:${c}"></div><div class="line"></div><div class="line short"></div></div>`).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { margin: 0; font-family: sans-serif; background: #f4f4f4; }
        header { background: #232f3e; color: white; padding: 18px 40px; display: flex; align-items: center; gap: 40px; }
        header b { font-size: 28px; } header span { opacity: .8; }
        .search { flex: 1; height: 38px; background: white; border-radius: 6px; }
        .hero { margin: 24px 40px; height: 170px; border-radius: 10px; background: linear-gradient(90deg, #ff9a44, #fc6076);
                color: white; font-size: 40px; font-weight: bold; display: flex; align-items: center; padding-left: 40px; }
        .grid { margin: 0 40px; display: grid; grid-template-columns: repeat(6, 1fr); gap: 18px; }
        .tile { background: white; border-radius: 8px; padding: 12px; }
        .img { height: 120px; border-radius: 6px; margin-bottom: 10px; }
        .line { height: 10px; background: #ddd; border-radius: 5px; margin-bottom: 8px; } .short { width: 60%; }
    </style></head><body><header><b>${t.shopTitle}</b><div class="search"></div><span>☰</span></header>
    <div class="hero">${t.shopClaim}</div><div class="grid">${tiles}</div></body></html>`;
}


function frame(caption, image, addressBar, overlay = '') {
    // Store-Bild: Überschrift oben, darunter ein Browserfenster mit dem Screenshot.
    const [title, subtitle] = caption;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { margin: 0; width: 1280px; height: 800px; overflow: hidden; font-family: sans-serif;
               background: linear-gradient(160deg, #fff6f4 0%, #ffe3df 100%); }
        h1 { margin: 44px 0 6px; text-align: center; font-size: 46px; color: #222; }
        p  { margin: 0 0 30px; text-align: center; font-size: 23px; color: #555; }
        .window { position: relative; margin: 0 auto; width: 1120px; border-radius: 12px; overflow: hidden; background: white;
                  box-shadow: 0 18px 50px rgba(120, 20, 10, .22); }
        .bar { height: 40px; background: #ececec; display: flex; align-items: center; gap: 8px; padding: 0 14px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; background: #c9c9c9; }
        .url { margin-left: 16px; flex: 1; height: 24px; border-radius: 12px; background: white; color: #666;
               font-size: 14px; line-height: 24px; padding-left: 14px; }
        .shot { display: block; width: 1120px; }
        .popup { position: absolute; top: 46px; right: 16px; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,.3); }
    </style></head><body>
        <h1>${title}</h1><p>${subtitle}</p>
        <div class="window"><div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span>
            <span class="url">${addressBar}</span></div>
            <img class="shot" src="${image}">${overlay}</div>
    </body></html>`;
}


function promoTile(t, icon) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { margin: 0; width: 440px; height: 280px; overflow: hidden; font-family: sans-serif;
               background: linear-gradient(160deg, #ff4b3e 0%, #d81e14 100%); color: white;
               display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .plate { width: 116px; height: 116px; border-radius: 50%; background: white; display: flex;
                 align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,.25); }
        img { width: 96px; height: 96px; }
        h1 { margin: 12px 0 2px; font-size: 36px; }
        p  { margin: 0; font-size: 20px; opacity: .95; }
    </style></head><body><div class="plate"><img src="${icon}"></div><h1>ShapeMyWeb</h1><p>${t.tagline}</p></body></html>`;
}


async function steady(page) {
    // Möglichst gleiche Bilder bei jedem Lauf: kein Zufall (Farbe neuer Alternativen, Augen) und kein
    // blinkender Cursor. Pixelgenau gleich wird das Stoppschild trotzdem nicht, seine Animation läuft auf Timern.
    await page.evaluateOnNewDocument(() => {
        Math.random = () => 0.42;
        document.addEventListener('DOMContentLoaded', () => {
            const style = document.createElement('style');
            style.textContent = '* { caret-color: transparent !important; }';
            document.head.append(style);
        });
    });
}


const dataUrl = buffer => 'data:image/png;base64,' + Buffer.from(buffer).toString('base64');


async function render(browser, html, file, width = 1280, height = 800) {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: file });
    await page.close();
}


async function assetsFor(lang) {
    const t = texts[lang];
    const dir = path.join(outDir, lang);
    fs.mkdirSync(dir, { recursive: true });

    // Alle Domains zeigen auf diesen Server; die Shop-Domain liefert die erfundene Shop-Seite.
    const server = http.createServer((req, res) => {
        res.setHeader('content-type', 'text/html');
        res.end(req.headers.host.startsWith(t.shop) ? shopPage(t) : `<h1>${req.headers.host}</h1>`);
    }).listen(0);
    const port = server.address().port;

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: true,
        env: { ...process.env, LANGUAGE: lang },
        args: [`--lang=${lang}`, `--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`,
               `--host-resolver-rules=MAP * 127.0.0.1:${port}`, '--no-sandbox', '--hide-scrollbars'],
    });
    try {
        const sw     = await browser.waitForTarget(target => target.type() === 'service_worker');
        const extUrl = `chrome-extension://${new URL(sw.url()).host}/`;
        const page   = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await steady(page);

        // Shop-Seite, solange sie noch nicht vermieden wird
        await page.goto(`http://${t.shop}:${port}/`);
        const shop = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: shotHeight } });

        // Popup über der Shop-Seite. Als eigener Tab geöffnet, deshalb wird der "aktive Tab" auf den Shop gesetzt.
        const popup = await browser.newPage();
        await popup.setViewport({ width: 245, height: 600 });
        await popup.evaluateOnNewDocument(shopUrl => {
            chrome.tabs.query = async () => [{ id: -1, url: shopUrl }];
        }, `https://www.${t.shop}/`);
        await popup.goto(extUrl + 'popup.html');
        await sleep(1000);
        const popupBox = await (await popup.$('body > div')).boundingBox();
        const popupShot = await popup.screenshot({ clip: { x: 0, y: 0, width: 245, height: Math.ceil(popupBox.height) } });

        // Liste anlegen (über eine Extension-Seite, wie die echten Seiten auch)
        const send = msg => popup.evaluate(m => chrome.runtime.sendMessage(m), msg);
        await send({ type: 'actualize-AO', avoid: {
            domain: t.shop, reminder: t.reminder, avoidLevels: [2, 2, 1, 2], subDomains: [],
            alternatives: t.alternatives.map(a => ({ ...a, name: new URL(a.url).hostname }))
        } });

        // Stoppschild
        await page.goto(`http://www.${t.shop}:${port}/`).catch(() => {});
        await sleep(2500);
        // Mehrere Schritte, damit das Schild die Maus sicher bemerkt (Augen, Farbe)
        await page.mouse.move(900, 300, { steps: 5 });
        await page.mouse.move(980, 320, { steps: 5 });
        await sleep(2500);   // bis die Augen-Animation zur Ruhe kommt
        const sign = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: shotHeight } });

        // Editmode: neue Seite vermeiden, Erinnerung schreiben, Alternative hinzufügen
        const edit = await browser.newPage();
        await edit.setViewport({ width: 1280, height: 800 });
        await steady(edit);
        await edit.goto(`${extUrl}showstopper.html?url=${encodeURIComponent(`https://www.${t.feed}${t.feedPath}`)}&new=1`);
        await sleep(1500);
        await edit.click('#reminderEntrybox');
        await edit.evaluate(() => { document.getElementById('reminderEntrybox').value = ''; });
        await edit.type('#reminderEntrybox', t.feedReminder);
        await edit.evaluate(url => {
            const input = document.getElementById('inputAlternatives');
            input.value = url;
            input.dispatchEvent(new Event('change'));
        }, t.feedAlternative.url);
        await sleep(300);
        await edit.type('#inputAlternativeClaim0', t.feedAlternative.claim);
        await edit.evaluate(() => document.activeElement.blur());
        await sleep(2500);
        const editShot = await edit.screenshot({ clip: { x: 0, y: 0, width: 1280, height: shotHeight } });

        // Willkommensseite
        const welcome = await browser.newPage();
        await welcome.setViewport({ width: 1280, height: 800 });
        await welcome.goto(extUrl + 'welcome.html');
        await welcome.evaluate(() => { document.body.style.zoom = 0.75; });   // mehr von der Seite zeigen
        await sleep(500);
        const welcomeShot = await welcome.screenshot({ clip: { x: 0, y: 0, width: 1280, height: shotHeight } });

        const extAddress = 'ShapeMyWeb';
        await render(browser, frame(t.captions[0], dataUrl(sign), extAddress), path.join(dir, '1-stoppschild.png'));
        await render(browser, frame(t.captions[1], dataUrl(shop), `${t.shop}`,
            `<img class="popup" src="${dataUrl(popupShot)}">`), path.join(dir, '2-popup.png'));
        await render(browser, frame(t.captions[2], dataUrl(editShot), extAddress), path.join(dir, '3-editmode.png'));
        await render(browser, frame(t.captions[3], dataUrl(welcomeShot), extAddress), path.join(dir, '4-willkommen.png'));

        const icon = dataUrl(fs.readFileSync(path.join(extDir, 'images', 'icon-128.png')));
        await render(browser, promoTile(t, icon), path.join(dir, 'promo-440x280.png'), 440, 280);
    } finally {
        await browser.close();
        server.close();
    }
    console.log(`• ${lang}: ${fs.readdirSync(dir).join(', ')}`);
}


(async () => {
    for (const lang of Object.keys(texts)) await assetsFor(lang);
})().catch(e => {
    console.error('Store-Bilder FEHLGESCHLAGEN:', e.message);
    process.exit(1);
});
