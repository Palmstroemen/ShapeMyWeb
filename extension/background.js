// Hintergrundprozess der Extension (Manifest V3).
// Chrome startet dieses Script als Service Worker, Firefox als Event Page.
// Beide werden vom Browser nach kurzer Untätigkeit beendet. Deshalb steht hier
// KEIN Zustand in globalen Variablen: Blacklist, Rolle, Pause usw. liegen in
// chrome.storage und werden bei jedem Ereignis frisch gelesen.
//
// Speicheraufteilung:
//   storage.sync    (über alle Geräte gesynct)  Blacklist-Einträge "bl:<domain>", globale Settings
//   storage.local   (pro Gerät)                 aktive Rolle, Pausezeit, Wiederaufwachzeit
//   storage.session (bis zum Browserende)       temporäre Whitelist

if (typeof importScripts === 'function' && typeof splitUrl === 'undefined') {
    // Im Chrome Service Worker. In Firefox lädt das Manifest globalFunctions.js mit.
    importScripts('libraries/globalFunctions.js');
}

const blockPage       = chrome.runtime.getURL('showstopper.html');
const blPrefix        = 'bl:';
const passByTime      = 12 * 1000;   // So lange darf man nach "pass-by" auf der Seite bleiben.
const level1Time      = 60 * 1000;   // Avoid-Level 1 warnt höchstens einmal pro Minute.
const designs         = ['classic', 'calm'];   // angezeigt als "Funny" (Stoppschild) bzw. "Professional"
const defaultSynced   = { textOpacity: 0.7, showRole: [true, true, true, true],
                          justRiseAvoidLevels: false, noChangeToAvoidLevel0: false, design: 'classic' };
const defaultLocal    = { pauseTime: 10 };


// Eventlisteners ........................................................
// Müssen synchron beim Start registriert werden, sonst weckt der Browser den
// Service Worker für diese Ereignisse nicht auf.
chrome.webNavigation.onBeforeNavigate.addListener(checkNavigation);
chrome.webNavigation.onHistoryStateUpdated.addListener(checkNavigation);
chrome.runtime.onMessage.addListener(onMessage);
chrome.runtime.onInstalled.addListener(onInstalled);
chrome.omnibox.onInputEntered.addListener(onOmnibox);


async function checkNavigation(details) {
    // Wird bei jeder Navigation aufgerufen. Nur der Hauptframe zählt.
    if (details.frameId !== 0 || details.tabId < 0) return;
    if (!isWebUrl(details.url)) return;
    if (await isPaused()) return;

    let result = await checkBlacklist(details.url);
    if (await shouldBlock(result)) {
        await blockTab(details.tabId, details.url);
    }
}


// Messages ..............................................................

const handlers = {
    "avoid-site": async (request, sender) => {
        // öffnet den ShowStopper im Editmode für eine neue Seite
        let tabId = request.tabId ?? sender.tab?.id ?? await activeTabId();
        await openShowstopper(tabId, request.url, true);
    },

    "whom-do-I-avoid?": async (request, sender) => {
        // Die ShowStopper-Seite fragt, für welche Seite sie angezeigt wird.
        // Die Seite selbst soll nicht im Verlauf landen.
        if (sender.url) chrome.history.deleteUrl({ url: sender.url }).catch(() => {});
        let AO = request.isNew ? await getNewAO(request.url) : await checkBlacklist(request.url);
        return {
            AO:       AO,
            role:     await getRole(),
            mode:     "block",
            settings: await loadSettings()
        };
    },

    "is-this-tab-avoided?": async (request) => {
        // Das Popup fragt nach dem aktuellen Tab. Steht dort gerade der ShowStopper,
        // dann zählt die Seite, die er blockiert.
        let url = blockedUrlOf(request.tab.url) ?? request.tab.url;
        return {
            AO:   await checkBlacklist(url),
            role: await getRole()
        };
    },

    "actualize-AO": async (request) => {
        await actualizeBlacklist(request.avoid);
    },

    "unavoid-site": async (request, sender) => {
        let domain = request.avoidDomain || splitUrl(request.url)[0];
        await removeFromBlacklist(domain);
        let tabId = request.tabId ?? sender.tab?.id;
        if (tabId !== undefined && isWebUrl(request.url)) {
            await chrome.tabs.update(tabId, { url: request.url });
        }
    },

    "pass-by!": async (request, sender) => {
        // Einmal durchlassen: die Domain kurz auf die temporäre Whitelist setzen.
        let [domain] = splitUrl(request.url);
        await whitelistTemporarily(domain, passByTime);
        let tabId = request.tabId ?? sender.tab?.id;
        if (tabId !== undefined && isWebUrl(request.url)) {
            await chrome.tabs.update(tabId, { url: request.url });
        }
    },

    "pause": async () => {
        let settings = await loadSettings();
        await pause(settings.pauseTime);
    },

    "unpause": async () => {
        await pause(-1);
    },

    "paused?": async () => {
        return { paused: await isPaused() };
    },

    "setRole": async (request) => {
        await chrome.storage.local.set({ role: request.role });
    },

    "getRole": async () => {
        return { type: "yourRole", role: await getRole() };
    },

    "setAvoidLevels": async (request) => {
        let entry = await getEntry(request.avoidDomain);
        if (entry) {
            entry.avoidLevels = request.avoidLevels;
            await saveEntry(request.avoidDomain, entry);
        }
    },

    "setup": async () => {
        await chrome.tabs.create({ url: chrome.runtime.getURL('smw-setup.html') });
    },

    "welcome": async () => {
        await openWelcome();
    },

    "saveSettings": async (request) => {
        await saveSettings(request.settings);
    },

    "getSettings": async () => {
        return { type: "settings", settings: await loadSettings() };
    },

    "getBlacklist": async () => {
        return { blacklist: await loadBlacklist() };
    }
};


function onMessage(request, sender, respond) {
    let handler = handlers[request.type];
    if (!handler) return false;   // ist für eine andere Seite der Extension bestimmt
    handler(request, sender).then(respond, (error) => {
        console.error("BAC: Fehler bei", request.type, error);
        respond(undefined);
    });
    return true;   // Antwort kommt asynchron
}


async function onInstalled(details) {
    if (details.reason === 'install') {
        await openWelcome();
    }
    if (details.reason === 'update') {
        await migrateOldBlacklist();
    }
}


async function openWelcome() {
    await chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
}


async function onOmnibox(text) {
    // "avoid" + Enter in der Adresszeile: die aktuelle Seite vermeiden.
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && isWebUrl(tab.url)) {
        await openShowstopper(tab.id, tab.url, true);
    }
}


// Tabs ..................................................................

async function activeTabId() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id;
}


async function openShowstopper(tabId, url, isNew) {
    let target = blockPage + '?url=' + encodeURIComponent(url) + (isNew ? '&new=1' : '');
    await chrome.tabs.update(tabId, { url: target });
}


async function blockTab(tabId, url) {
    // Ruft statt der geplanten URL den ShowStopper in dem Tab auf.
    try {
        await openShowstopper(tabId, url, false);
    } catch (error) {
        console.log("BAC: Tab", tabId, "konnte nicht umgeleitet werden:", error.message);
    }
}


function blockedUrlOf(url) {
    // Liefert die blockierte URL, wenn url eine ShowStopper-Seite ist.
    if (!url || !url.startsWith(blockPage)) return undefined;
    return new URL(url).searchParams.get('url') ?? undefined;
}


// Pause / Rolle / Settings ..............................................

async function isPaused() {
    let { rewake } = await chrome.storage.local.get({ rewake: 0 });
    return Date.now() < rewake;
}


async function pause(minutes) {
    // Pausiert das System indem es eine Rewaketime setzt.
    // Löschen der Pause mit: pause(-1)
    let rewake = minutes > 0 ? Date.now() + minutes * 60 * 1000 : 0;
    await chrome.storage.local.set({ rewake: rewake });
}


async function getRole() {
    // Die aktive Rolle wird auf dem Gerät und nicht in der Cloud gespeichert.
    // so kann jedes Gerät eine andere aktive Rolle haben.
    // z.B. Firmencomputer, Homecomputer, Tablet, ...
    let { role } = await chrome.storage.local.get({ role: 0 });
    return role;
}


async function loadSettings() {
    // global = gesynced über alle Devices, local = auf jedem Device extra gespeichert.
    let synced = await chrome.storage.sync.get(defaultSynced);
    let local  = await chrome.storage.local.get(defaultLocal);
    return { ...synced, ...local };
}


async function saveSettings(settings) {
    await chrome.storage.local.set({ pauseTime: settings.pauseTime ?? defaultLocal.pauseTime });
    await chrome.storage.sync.set({
        textOpacity:           settings.textOpacity,
        showRole:              settings.showRole,
        justRiseAvoidLevels:   !!settings.justRiseAvoidLevels,
        noChangeToAvoidLevel0: !!settings.noChangeToAvoidLevel0,
        design:                designs.includes(settings.design) ? settings.design : 'classic'
    });
}


async function whitelistTemporarily(domain, milliseconds) {
    let { tempWhitelist } = await chrome.storage.session.get({ tempWhitelist: {} });
    tempWhitelist[domain] = Date.now() + milliseconds;
    await chrome.storage.session.set({ tempWhitelist: tempWhitelist });
}


async function isWhitelisted(domain) {
    let { tempWhitelist } = await chrome.storage.session.get({ tempWhitelist: {} });
    return Date.now() < (tempWhitelist[domain] ?? 0);
}


// Blacklist .............................................................
// Jeder Eintrag liegt unter einem eigenen Schlüssel "bl:<domain>". So greift
// das Limit von 8 KB pro Eintrag in storage.sync nicht mehr für die ganze Liste.

async function getEntry(domain) {
    if (!domain) return undefined;
    let key = blPrefix + domain;
    return (await chrome.storage.sync.get(key))[key];
}


async function saveEntry(domain, entry) {
    await chrome.storage.sync.set({ [blPrefix + domain]: entry });
}


async function loadBlacklist() {
    let all = await chrome.storage.sync.get(null);
    let bl  = {};
    for (let key in all) {
        if (key.startsWith(blPrefix)) bl[key.slice(blPrefix.length)] = all[key];
    }
    return bl;
}


async function migrateOldBlacklist() {
    // Version 0.2 speicherte die ganze Blacklist unter einem einzigen Schlüssel.
    let { blackList } = await chrome.storage.sync.get('blackList');
    if (!blackList) return;
    let entries = {};
    for (let domain in blackList) {
        if (/^youtube\d+\.com$/.test(domain)) continue;   // Democontent von 0.2
        let entry = blackList[domain];
        if (!Array.isArray(entry.alternatives)) entry.alternatives = [];
        entries[blPrefix + domain] = entry;
    }
    await chrome.storage.sync.set(entries);
    await chrome.storage.sync.remove('blackList');
    console.log("BAC: Blacklist migriert:", Object.keys(entries).length, "Einträge");
}


async function getNewAO(url) {
    // Ein neues AvoidObject für den Editmode. War die Seite früher schon einmal
    // vermieden, werden ihre Levels und Alternativen weiterverwendet.
    let [domain] = splitUrl(url);
    let entry    = await getEntry(domain);
    return {
        url:          url,
        domain:       domain,
        subDomains:   [],
        reminder:     "new",
        avoidLevels:  entry?.avoidLevels ?? [1, 1, 1, 1],
        alternatives: entry?.alternatives ?? []
    };
}


async function actualizeBlacklist(AO) {
    // Aktualisiert einen Eintrag der Blacklist und speichert ihn gleich.
    // Fügt auch neue Einträge hinzu.
    let domain = AO.domain;
    if (!domain || domain == chrome.runtime.id) {
        console.log("BAC: Domain", domain, "wird nicht in die Blacklist aufgenommen.");
        return;
    }
    await saveEntry(domain, {
        subDomains:   Array.isArray(AO.subDomains)   ? AO.subDomains   : [],
        reminder:     AO.reminder,
        avoidLevels:  Array.isArray(AO.avoidLevels)  ? AO.avoidLevels  : [1, 1, 1, 1],
        alternatives: Array.isArray(AO.alternatives) ? AO.alternatives : []
    });
}


async function removeFromBlacklist(domain) {
    // Löscht den Reminder und die Subdomains. Levels und Alternativen bleiben
    // erhalten, damit sie beim nächsten Vermeiden wieder da sind.
    let entry = await getEntry(domain);
    if (entry) {
        entry.reminder   = undefined;
        entry.subDomains = [];
        await saveEntry(domain, entry);
    }
}


async function checkBlacklist(url) {
    // Prüft, ob sich die Domain von url in der Blacklist findet.
    // und gibt das Ergebnis des Checks zurück.
    let resultingAO = {
        url:          url,
        domain:       "me",
        subDomains:   [],
        reminder:     undefined,
        avoidLevels:  [0, 0, 0, 0],
        alternatives: [],
        block:        false,
        entry:        false,
        avoided:      false
    };
    if (!isWebUrl(url)) return resultingAO;   // eigene Seiten, about:, chrome:// ...

    let [domain, subDomains] = splitUrl(url);
    resultingAO.domain = domain;

    let foundEntry = await getEntry(domain);
    if (foundEntry) {
        let subs  = foundEntry.subDomains ?? [];
        let block = true;   // kein Subdomain-Eintrag bedeutet ganze Seite sperren
        if (subs.length > 0) {
            // Sind Subdomains gespeichert, dann sind nur diese zu sperren.
            block = subs.some(sub => subDomains.includes(sub));
        }
        resultingAO.subDomains   = subs;
        resultingAO.reminder     = foundEntry.reminder;
        resultingAO.avoidLevels  = foundEntry.avoidLevels ?? [0, 0, 0, 0];
        resultingAO.alternatives = foundEntry.alternatives ?? [];
        resultingAO.block        = block;
        resultingAO.entry        = true;   // auch true, wenn der avoidLevel der aktiven Rolle 0 ist.
        resultingAO.avoided      = foundEntry.reminder !== undefined;
    }
    return resultingAO;
}


async function shouldBlock(result) {
    // Entscheidet abhängig vom Avoid-Level der aktiven Rolle, ob blockiert wird.
    if (!result.block || !result.avoided) return false;
    let avoidLevel = result.avoidLevels[await getRole()] ?? 0;
    if (avoidLevel <= 0) return false;
    if (await isWhitelisted(result.domain)) return false;
    if (avoidLevel == 1) {
        await whitelistTemporarily(result.domain, level1Time);
    }
    return true;
}


function addDemoContent() {
    // Zum Ausprobieren in der Konsole des Service Workers aufrufen.
    let demo = [
        ["derstandard.at", ['story', 'service', 'fish'], "zu viel bunt ist nicht gesunt."],
        ["diepresse.com",  [], "zu konservativ."],
        ["youtube.com",    [], "nix videoschaun."]
    ];
    return Promise.all(demo.map(([domain, subDomains, reminder]) => actualizeBlacklist({
        domain, subDomains, reminder,
        avoidLevels:  [0, 1, 2, 3],
        alternatives: [newAlternative('https://www.orf.at'), newAlternative('https://www.diepresse.com')]
    })));
}
