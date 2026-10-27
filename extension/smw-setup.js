// Die Einstellungsseite: Darstellung, Schnellstart-Pakete, vermiedene Webseiten, Export und Import.
// Alles wird mit DOM-Funktionen aufgebaut (kein innerHTML), auch importierte Daten bleiben reiner Text.
"use strict";

const msg       = key => chrome.i18n.getMessage(key);
const lang      = chrome.i18n.getUILanguage().split('-')[0];
const roleNames = ['L066', 'L067', 'L068', 'L069'];
let blacklist   = {};


function el(tag, props = {}, ...children) {
    let element = document.createElement(tag);
    for (let [key, value] of Object.entries(props)) {
        if (key == 'class')              element.className = value;
        else if (key == 'dataset')       Object.assign(element.dataset, value);
        else if (key.startsWith('on'))   element.addEventListener(key.slice(2), value);
        else                             element[key] = value;
    }
    element.append(...children.filter(child => child !== undefined && child !== null));
    return element;
}


function send(message) {
    return chrome.runtime.sendMessage(message);
}


async function refresh() {
    blacklist = (await send({ type: 'getBlacklist' })).blacklist;
    updatePackageStates();
    renderBlacklist();
}


function altColor(url) {
    // Feste Pastellfarbe pro Adresse, damit Pakete immer gleich aussehen
    let hash = [...url].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
    return 'hsl(' + hash + ', 45%, 75%)';
}


function domainFrom(text) {
    // "temu.com", "www.temu.com" oder eine ganze URL -> "temu.com"
    if (!text) return '';
    let url = /^[a-z]+:\/\//i.test(text) ? text : 'https://' + text;
    if (!isWebUrl(url)) return '';
    let [domain] = splitUrl(url);
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain) ? domain.toLowerCase() : '';
}


// Darstellung ...........................................................

function initDesignSetup(settings) {
    // Umschalter zwischen "Funny" (Stoppschild) und "Professional"
    document.getElementById(settings.design == 'calm' ? 'setupDesignCalm' : 'setupDesignClassic').checked = true;
    for (let radio of document.querySelectorAll('input[name="design"]')) {
        radio.addEventListener('change', function () {
            settings.design = this.value;
            send({ type: "saveSettings", settings: settings }).then(showSaved);
        });
    }
}


// Schnellstart-Pakete ...................................................
// Jedes Paket hat einen Schalter. Alles wird sofort gespeichert, es gibt keine Bestätigungstaste.

function covers(entry, subDomains) {
    // Deckt ein gespeicherter Eintrag die Teilbereiche eines Pakets ab? Leer = ganze Seite.
    if (!entry || entry.reminder === undefined) return false;
    let stored = entry.subDomains ?? [];
    return stored.length == 0 || (subDomains.length > 0 && subDomains.every(s => stored.includes(s)));
}


function isActive(pkg) {
    return pkg.domains.every(d => covers(blacklist[d.domain], d.subDomains));
}


function storedAlternatives(pkg) {
    // Welche Alternativen des Pakets sind gespeichert? (am ersten Eintrag gemessen)
    let entry = blacklist[pkg.domains[0].domain];
    return new Set((entry?.alternatives ?? []).map(a => a.url));
}


function updatePackageStates() {
    for (let pkg of PACKAGES) {
        let card = document.querySelector('[data-package="' + pkg.id + '"]');
        if (!card) continue;
        let active = isActive(pkg);
        card.classList.toggle('adopted', active);
        card.querySelector('.packageToggle').checked = active;
        if (active) {
            let stored = storedAlternatives(pkg);
            for (let box of card.querySelectorAll('input.packageAlt')) box.checked = stored.has(box.value);
        }
    }
}


function renderPackages() {
    document.getElementById('packageList').replaceChildren(...PACKAGES.map(packageCard));
}


function packageCard(pkg) {
    let card    = el('div', { class: 'package', dataset: { package: pkg.id } });
    let preview = el('div', { class: 'packagePreview', hidden: true });
    card.append(
        el('label', { class: 'packageSwitch' },
            el('input', { type: 'checkbox', class: 'packageToggle', onchange: () => togglePackage(pkg, card) }),
            el('span', { class: 'packageTitle', textContent: msg('S012') + ' ' + localized(pkg.title, lang) })),
        el('div', { class: 'packageInfo' },
            el('span', { textContent: pkg.alternatives.length + ' ' + msg('S017') }),
            el('button', { type: 'button', class: 'link packageDetails', textContent: msg('S045'),
                           onclick: () => toggleDetails(pkg, card, preview) })),
        preview);
    return card;
}


function toggleDetails(pkg, card, preview) {
    if (!preview.hidden) {
        preview.hidden = true;
        card.classList.remove('open');
        return;
    }
    let active   = isActive(pkg);
    let stored   = storedAlternatives(pkg);
    let regions  = regionsFor(navigator.languages);
    let current  = active ? blacklist[pkg.domains[0].domain].reminder : localized(pkg.reminder, lang);
    let domains  = pkg.domains.map(d => d.domain + (d.subDomains.length ? ' (' + msg('S042') + ' /' + d.subDomains.join(', /') + ')' : ''));
    preview.replaceChildren(
        el('p', { class: 'small muted', textContent: domains.join(', ') }),
        el('div', { class: 'small muted', textContent: msg('S018') }),
        el('input', { type: 'text', class: 'packageReminder', value: current,
                      onchange: function () { changeReminder(pkg, this.value); } }),
        ...pkg.alternatives.map(a => el('label', {},
            el('input', { type: 'checkbox', class: 'packageAlt', value: a.url,
                          checked: active ? stored.has(a.url) : preselected(a, regions),
                          onchange: function () { changeAlternative(pkg, a, this.checked); } }),
            el('span', {},
                el('span', { class: 'altName', textContent: a.name }), ' – ',
                el('span', { class: 'altClaim', textContent: localized(a.claim, lang) })))));
    preview.hidden = false;
    card.classList.add('open');
}


function packageAlternative(a) {
    return { url: a.url, name: a.name, claim: localized(a.claim, lang), color: altColor(a.url) };
}


function chosenAlternatives(pkg, card) {
    // Sind die Details offen, gelten die Häkchen, sonst die Vorauswahl nach Region.
    let boxes = card.querySelectorAll('input.packageAlt');
    if (boxes.length) {
        let chosen = new Set([...boxes].filter(box => box.checked).map(box => box.value));
        return pkg.alternatives.filter(a => chosen.has(a.url));
    }
    let regions = regionsFor(navigator.languages);
    return pkg.alternatives.filter(a => preselected(a, regions));
}


async function togglePackage(pkg, card) {
    if (card.querySelector('.packageToggle').checked) {
        let reminder = card.querySelector('.packageReminder')?.value.trim() || localized(pkg.reminder, lang);
        let entries  = {};
        for (let d of pkg.domains) {
            entries[d.domain] = {
                reminder:     reminder,
                subDomains:   d.subDomains,
                avoidLevels:  [1, 1, 1, 1],   // höchstens einmal pro Minute erinnern
                alternatives: chosenAlternatives(pkg, card).map(packageAlternative)
            };
        }
        await send({ type: 'adopt-entries', entries: entries });
    } else {
        let entries = {};
        for (let d of pkg.domains) entries[d.domain] = { subDomains: d.subDomains };
        await send({ type: 'release-entries', entries: entries });
    }
    await refresh();
    showSaved();
}


async function changeAlternative(pkg, alternative, checked) {
    if (!isActive(pkg)) return;   // ausgeschaltet: nur Auswahl für später
    for (let d of pkg.domains) {
        let entry = blacklist[d.domain];
        let alternatives = (entry.alternatives ?? []).filter(a => a.url != alternative.url);
        if (checked) alternatives.push(packageAlternative(alternative));
        await send({ type: 'actualize-AO', avoid: { ...entry, alternatives: alternatives, domain: d.domain } });
    }
    await refresh();
    showSaved();
}


async function changeReminder(pkg, text) {
    if (!isActive(pkg) || !text.trim()) return;
    for (let d of pkg.domains) {
        await send({ type: 'actualize-AO', avoid: { ...blacklist[d.domain], reminder: text.trim(), domain: d.domain } });
    }
    await refresh();
    showSaved();
}


let savedTimer;

function showSaved() {
    let notice = document.getElementById('savedNotice');
    notice.classList.add('visible');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => notice.classList.remove('visible'), 1800);
}


// Vermiedene Webseiten ..................................................

function renderBlacklist() {
    let list    = document.getElementById('domainlist');
    let domains = Object.keys(blacklist).sort();
    if (domains.length == 0) {
        list.replaceChildren(el('p', { class: 'muted', textContent: msg('S031') }));
        return;
    }
    list.replaceChildren(...domains.map(domain => entryCard(domain, blacklist[domain])));
}


async function saveEntry(domain, entry) {
    await send({ type: 'actualize-AO', avoid: { ...entry, domain: domain } });
    await refresh();
    showSaved();
}


function entryCard(domain, entry) {
    let avoided      = entry.reminder !== undefined;
    let alternatives = entry.alternatives ?? [];
    let levels       = entry.avoidLevels ?? [1, 1, 1, 1];
    let save         = changes => saveEntry(domain, { ...entry, ...changes });

    let reminderInput = el('input', { type: 'text', class: 'entryReminder', value: entry.reminder ?? '',
        placeholder: avoided ? '' : msg('S032'),
        onchange: () => { if (avoided) save({ reminder: reminderInput.value.trim() || msg('S041') }); } });

    let actions = el('div', { class: 'entryActions' },
        avoided
            ? el('button', { type: 'button', class: 'link entryUnavoid', textContent: msg('S025'),
                             onclick: async () => { await send({ type: 'unavoid-site', avoidDomain: domain }); await refresh(); showSaved(); } })
            : el('button', { type: 'button', class: 'link entryReavoid', textContent: msg('S026'),
                             onclick: () => save({ reminder: reminderInput.value.trim() || msg('S041') }) }),
        el('button', { type: 'button', class: 'link entryDelete', textContent: msg('S027'),
                       onclick: async () => {
                           if (!confirm(msg('S040'))) return;
                           await send({ type: 'delete-entry', domain: domain });
                           await refresh();
                           showSaved();
                       } }));

    let meta = el('div', { class: 'entryMeta' }, el('span', { textContent: msg('S028') + ':' }),
        ...roleNames.map((name, role) => el('label', {}, msg(name) + ' ',
            el('select', { class: 'level', dataset: { role: role },
                           onchange: function () {
                               let changed = [...levels];
                               changed[role] = Number(this.value);
                               save({ avoidLevels: changed });
                           } },
                ...[0, 1, 2, 3].map(level => el('option', { value: level, textContent: level, selected: levels[role] == level }))))),
        (entry.subDomains ?? []).length ? el('span', { textContent: msg('S042') + ' /' + entry.subDomains.join(', /') }) : null);

    let altUrl   = el('input', { type: 'url', class: 'altUrl', placeholder: msg('S029') });
    let altClaim = el('input', { type: 'text', class: 'altClaim', placeholder: msg('S030') });
    let addAlternative = () => {
        let text = altUrl.value.trim();
        let url  = /^[a-z]+:\/\//i.test(text) ? text : 'https://' + text;
        if (!domainFrom(url)) return altUrl.focus();
        save({ alternatives: [...alternatives, { url: url, name: splitUrl(url)[0], claim: altClaim.value.trim(), color: altColor(url) }] });
    };

    return el('div', { class: 'entry' + (avoided ? '' : ' inactive'), dataset: { domain: domain } },
        el('div', { class: 'entryHead' }, el('span', { class: 'entryDomain', textContent: domain }), reminderInput, actions),
        meta,
        el('div', { class: 'alternatives' },
            ...alternatives.map((a, index) => el('div', { class: 'altItem' },
                el('a', { href: isWebUrl(a.url) ? a.url : '#', target: '_blank', class: 'altName', textContent: a.name }),
                el('span', { class: 'altClaim', textContent: a.claim ?? '' }),
                el('button', { type: 'button', class: 'link altRemove', textContent: '×', title: msg('S027'),
                               onclick: () => save({ alternatives: alternatives.filter((_, i) => i != index) }) }))),
            el('div', { class: 'altAddRow' }, altUrl, altClaim,
                el('button', { type: 'button', class: 'altAdd', textContent: msg('S023'), onclick: addAlternative }))));
}


async function addEntry(event) {
    event.preventDefault();
    let domainInput   = document.getElementById('newDomain');
    let reminderInput = document.getElementById('newReminder');
    let domain        = domainFrom(domainInput.value.trim());
    document.getElementById('newDomainWarning').style.display = domain ? 'none' : 'block';
    if (!domain) return;
    await send({ type: 'adopt-entries', entries: { [domain]: {
        reminder: reminderInput.value.trim() || msg('S041'), subDomains: [], avoidLevels: [1, 1, 1, 1], alternatives: [] } } });
    domainInput.value = '';
    reminderInput.value = '';
    await refresh();
    showSaved();
}


// Export und Import .....................................................

function buildExport() {
    return JSON.stringify({ format: 'shapemyweb-list', version: 1, exported: new Date().toISOString(),
                            entries: blacklist }, null, 2);
}


function exportList() {
    let blob = new Blob([buildExport()], { type: 'application/json' });
    let link = el('a', { href: URL.createObjectURL(blob),
                         download: 'shapemyweb-liste-' + new Date().toISOString().slice(0, 10) + '.json' });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}


async function importList() {
    let input  = document.getElementById('importFile');
    let result = document.getElementById('importResult');
    let file   = input.files[0];
    input.value = '';   // damit dieselbe Datei erneut gewählt werden kann
    if (!file) return;
    let data;
    try {
        data = JSON.parse(await file.text());
    } catch (error) {
        data = undefined;
    }
    if (data?.format !== 'shapemyweb-list' || typeof data.entries !== 'object' || data.entries === null) {
        result.textContent = msg('S039');
        result.className = 'small error';
        return;
    }
    let ans = await send({ type: 'adopt-entries', entries: data.entries });
    result.textContent = msg('S037') + ' ' + ans.adopted.length;
    result.className = 'small';
    await refresh();
}


document.addEventListener("DOMContentLoaded", async function () {
    localizeHtmlPage();
    document.getElementById('newDomain').placeholder   = msg('S021');
    document.getElementById('newReminder').placeholder = msg('S022');
    document.getElementById('newEntry').addEventListener('submit', addEntry);
    document.getElementById('exportList').addEventListener('click', exportList);
    document.getElementById('importFile').addEventListener('change', importList);

    renderPackages();
    initDesignSetup((await send({ type: "getSettings" })).settings);
    await refresh();
});
