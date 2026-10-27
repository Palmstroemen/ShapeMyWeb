// Ein minimaler Nachbau der chrome.*-APIs, die background.js benutzt.
// Lädt globalFunctions.js und background.js in einen eigenen VM-Kontext,
// so wie der Browser es im Service Worker tut.
"use strict";
const fs   = require('node:fs');
const path = require('node:path');
const vm   = require('node:vm');

const extensionDir = path.join(__dirname, '..', 'extension');
const extensionUrl = 'chrome-extension://testid/';

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function fakeArea() {
    const data = {};
    return {
        data,
        async get(keys) {
            if (keys === null || keys === undefined) return clone(data);
            if (typeof keys === 'string') keys = [keys];
            const result = {};
            if (Array.isArray(keys)) {
                for (const key of keys) if (key in data) result[key] = clone(data[key]);
            } else {
                for (const key in keys) result[key] = key in data ? clone(data[key]) : clone(keys[key]);
            }
            return result;
        },
        async set(items) {
            for (const key in items) {
                // wie im Browser: undefined-Werte werden nicht gespeichert
                data[key] = JSON.parse(JSON.stringify(items[key]) ?? 'null');
            }
        },
        async remove(keys) {
            for (const key of [].concat(keys)) delete data[key];
        }
    };
}

function fakeEvent() {
    const listeners = [];
    return { listeners, addListener: fn => listeners.push(fn) };
}

function loadBackground() {
    const tabs = { updates: [], created: [], active: { id: 1, url: 'https://example.org/' } };
    const chrome = {
        runtime: {
            id: 'testid',
            getURL: file => extensionUrl + file,
            onMessage: fakeEvent(),
            onInstalled: fakeEvent()
        },
        storage: { sync: fakeArea(), local: fakeArea(), session: fakeArea() },
        webNavigation: { onBeforeNavigate: fakeEvent(), onHistoryStateUpdated: fakeEvent() },
        omnibox: { onInputEntered: fakeEvent() },
        history: { deleted: [], deleteUrl: async details => { chrome.history.deleted.push(details.url); } },
        tabs: {
            ...tabs,
            async update(tabId, props) { tabs.updates.push({ tabId, url: props.url }); },
            async create(props) { tabs.created.push(props.url); },
            async query() { return [tabs.active]; }
        }
    };

    const context = vm.createContext({ chrome, console, URL, URLSearchParams, structuredClone });
    context.importScripts = (...files) => {
        for (const file of files) {
            vm.runInContext(fs.readFileSync(path.join(extensionDir, file), 'utf8'), context, { filename: file });
        }
    };
    context.importScripts('background.js');

    // Hilfsfunktionen für die Tests
    const bg = {
        chrome, tabs, context,
        call: name => context[name],
        async send(request, sender = {}) {
            const listener = chrome.runtime.onMessage.listeners[0];
            return new Promise(resolve => {
                // Antwort in normale Objekte dieses Kontexts kopieren (für deepEqual)
                const async = listener(request, sender, ans => resolve(ans === undefined ? undefined : structuredClone(ans)));
                if (!async) resolve('not handled');
            });
        },
        async navigate(url, tabId = 7, frameId = 0) {
            const before = tabs.updates.length;
            for (const fn of chrome.webNavigation.onBeforeNavigate.listeners) {
                await fn({ url, tabId, frameId });
            }
            return tabs.updates.slice(before);
        }
    };
    return bg;
}

module.exports = { loadBackground, extensionUrl };
