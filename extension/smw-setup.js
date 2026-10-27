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
            send({ type: "saveSettings", settings: settings });
        });
    }
}


// Schnellstart-Pakete ...................................................

function covers(entry, subDomains) {
    // Deckt ein gespeicherter Eintrag die Teilbereiche eines Pakets ab? Leer = ganze Seite.
    if (!entry || entry.reminder === undefined) return false;
    let stored = entry.subDomains ?? [];
    return stored.length == 0 || (subDomains.length > 0 && subDomains.every(s => stored.includes(s)));
}


function updatePackageStates() {
    for (let pkg of PACKAGES) {
        let card = document.querySelector('[data-package="' + pkg.id + '"]');
        if (!card) continue;
        let adopted = pkg.domains.every(d => covers(blacklist[d.domain], d.subDomains));
        card.classList.toggle('adopted', adopted);
        card.querySelector('.packageView').textContent = msg(adopted ? 'S016' : 'S013');
    }
}


function renderPackages() {
    document.getElementById('packageList').replaceChildren(...PACKAGES.map(packageCard));
}


function packageCard(pkg) {
    let card    = el('div', { class: 'package', dataset: { package: pkg.id } });
    let preview = el('div', { class: 'packagePreview', hidden: true });
    card.append(
        el('div', { class: 'packageHead' },
            el('div', {},
                el('div', { class: 'packageTitle', textContent: msg('S012') + ' ' + localized(pkg.title, lang) }),
                el('div', { class: 'packageInfo', textContent: pkg.alternatives.length + ' ' + msg('S017') })),
            el('button', { type: 'button', class: 'packageView', textContent: msg('S013'),
                           onclick: () => togglePreview(pkg, card, preview) })),
        preview);
    return card;
}


function closePreview(card, preview) {
    preview.hidden = true;
    card.classList.remove('open');
}


function togglePreview(pkg, card, preview) {
    if (!preview.hidden) return closePreview(card, preview);
    let regions  = regionsFor(navigator.languages);
    let reminder = el('input', { type: 'text', class: 'packageReminder', value: localized(pkg.reminder, lang) });
    let domains  = pkg.domains.map(d => d.domain + (d.subDomains.length ? ' (' + msg('S042') + ' /' + d.subDomains.join(', /') + ')' : ''));
    preview.replaceChildren(
        el('p', { class: 'small muted', textContent: domains.join(', ') }),
        el('div', { class: 'small muted', textContent: msg('S018') }),
        reminder,
        ...pkg.alternatives.map(a => el('label', {},
            el('input', { type: 'checkbox', class: 'packageAlt', value: a.url, checked: preselected(a, regions) }),
            el('span', {},
                el('span', { class: 'altName', textContent: a.name }), ' – ',
                el('span', { class: 'altClaim', textContent: localized(a.claim, lang) })))),
        el('div', { class: 'row' },
            el('button', { type: 'button', class: 'primary packageApply', textContent: msg('S014'),
                           onclick: () => adoptPackage(pkg, reminder.value, card, preview) }),
            el('button', { type: 'button', class: 'link', textContent: msg('S015'),
                           onclick: () => closePreview(card, preview) })));
    preview.hidden = false;
    card.classList.add('open');
}


async function adoptPackage(pkg, reminder, card, preview) {
    let chosen = new Set([...preview.querySelectorAll('input.packageAlt:checked')].map(input => input.value));
    let alternatives = pkg.alternatives.filter(a => chosen.has(a.url))
        .map(a => ({ url: a.url, name: a.name, claim: localized(a.claim, lang), color: altColor(a.url) }));
    let entries = {};
    for (let d of pkg.domains) {
        entries[d.domain] = {
            reminder:     reminder.trim() || localized(pkg.reminder, lang),
            subDomains:   d.subDomains,
            avoidLevels:  [1, 1, 1, 1],   // höchstens einmal pro Minute erinnern
            alternatives: alternatives
        };
    }
    await send({ type: 'adopt-entries', entries: entries });
    closePreview(card, preview);
    await refresh();
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
                             onclick: async () => { await send({ type: 'unavoid-site', avoidDomain: domain }); await refresh(); } })
            : el('button', { type: 'button', class: 'link entryReavoid', textContent: msg('S026'),
                             onclick: () => save({ reminder: reminderInput.value.trim() || msg('S041') }) }),
        el('button', { type: 'button', class: 'link entryDelete', textContent: msg('S027'),
                       onclick: async () => {
                           if (!confirm(msg('S040'))) return;
                           await send({ type: 'delete-entry', domain: domain });
                           await refresh();
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
