"use strict";
// Das Menü, das beim Click auf das Icon erscheint.
// avoidLevels, activeRole, gotLevels, showAvoidLevels und toolbarLoaded kommen aus toolbar.js.
var myTab;
var pageLoaded = false;
var siteIsAvoided;
var url;
var avoidDomain;
var subDomains;
var reminder = "";
var alternatives;
var displayMode = 'normal';


document.addEventListener("DOMContentLoaded", async function () {
    // Wird aufgerufen sobald das Dokument geladen ist.
    localizeHtmlPage();
    await loadFragment("header", "header.html");
    await loadFragment("#toolbar", "toolbar.html");
    toolbarLoaded = true;
    initButtons();
    initSetupButton();
    pageLoaded = true;

    // Fragt den Background, ob die Seite im aktuellen Tab vermieden wird.
    [myTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let ans = await chrome.runtime.sendMessage({ type: "is-this-tab-avoided?", tab: myTab });
    initDataFromAO(ans.AO);
    setAllAvoidLevelButtons();
    showDomainInfo('edit');
    actualizeAvoidArea();
});


function initDataFromAO(AO) {
    siteIsAvoided = AO.avoided;
    url           = AO.url;
    avoidDomain   = AO.domain;
    subDomains    = AO.subDomains;
    reminder      = AO.reminder;
    avoidLevels   = AO.avoidLevels;
    alternatives  = AO.alternatives;
    gotLevels     = true;
    showAvoidLevels = siteIsAvoided && avoidLevels.some(level => level > 0);
}


function initSetupButton() {
    document.getElementById('buttonSetup').addEventListener('click', function () { goToSetup(); });
}

function goToSetup() {
    chrome.runtime.sendMessage({ type: 'setup' });
    window.close();
};


function actualizeAvoidArea() {
    // Aktualisiert das AvoidArea abhängig davon ob die Seite avoided ist.
    if (!isWebUrl(url)) {
        // Browser-interne Seiten (Einstellungen, neuer Tab, ...) kann man nicht vermeiden.
        document.getElementById("domainInfo").style.display = "none";
        return;
    }
    if (siteIsAvoided) {
        document.getElementById("unavoidArea").style.display = "block";
        document.getElementById("reminder").textContent = reminder;
        document.getElementById('buttonUnAvoid').addEventListener('click', function () {
            chrome.runtime.sendMessage({
                type: 'unavoid-site',
                url: url,
                avoidDomain: avoidDomain,
                tabId: myTab.id
            });
            window.close();
        });
    } else {
        document.getElementById("domainInfo").style.display = "block";
        document.getElementById("avoidArea").style.display = "block";
        document.getElementById('buttonAvoid').addEventListener('click', function () {
            chrome.runtime.sendMessage({
                type: 'avoid-site',
                url: url,
                tabId: myTab.id
            });
            window.close();
        });
    }
}


function actualizeSmallButtons() {
    // Diese Funktion braucht's, da sie von toolbar.js aufgerufen wird. Wird aber
    // nur in showstopper.js verwendet. Hier nicht.
}


function sendChanges() {
    // Wird aufgerufen, wenn Subdomains geändert werden (showDomainInfos.js).
    chrome.runtime.sendMessage({
        type: 'actualize-AO',
        avoid: {
            domain:       avoidDomain,
            subDomains:   subDomains,
            reminder:     reminder,
            avoidLevels:  avoidLevels,
            alternatives: alternatives
        }
    });
};
