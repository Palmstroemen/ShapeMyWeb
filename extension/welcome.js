// Die Willkommensseite: öffnet sich nach der Installation und über das Fragezeichen im Popup.
"use strict";

const isFirefox = chrome.runtime.getURL('').startsWith('moz-extension:');


document.addEventListener("DOMContentLoaded", function () {
    localizeHtmlPage();
    showIncognitoStatus();
});


function showIncognitoStatus() {
    // Ob die Extension in Inkognito- bzw. privaten Fenstern laufen darf, kann nur
    // der User selbst in den Einstellungen der Erweiterung freigeben.
    chrome.extension.isAllowedIncognitoAccess(function (allowed) {
        let status = document.getElementById('incognitoStatus');
        status.textContent = chrome.i18n.getMessage(allowed ? 'W032' : 'W033');
        status.parentElement.classList.add(allowed ? 'allowed' : 'notAllowed');

        // Firefox erlaubt Extensions nicht, about:addons zu öffnen.
        if (!allowed && !isFirefox) {
            let button = document.getElementById('buttonIncognito');
            button.hidden = false;
            button.addEventListener('click', function () {
                chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
            });
        }
    });
}
