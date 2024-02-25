console.log("Setup.js started");
// global Variables
//var blReminder = {};
//var blRoleValues = {};

//alert("Setup.js A");
//$.getScript("libraries/smw-blacklist.js", function() {});
//alert("Setup.js B");
/*
function getBlacklist() {
    chrome.storage.sync.get({
        // liest die Blacklist aus dem Speicher aus.
        // ...storage.sync... ist ein mit dem Google-Konto auf allen Geräten gesyncter Speicher.
        // ...storage.local... wäre ein lokaler Speicher auf dem Gerät.
            'reminders': blReminder,
            'roles': blRoleValues
        }, function () {

    });
}
*/

function refreshBlacklist() {
    var blacklistSetup = "";
    for (domain in blReminder) {
        var reminder = blReminder[domain];
        blacklistSetup += "<li class=\"ui-widget-content\"><strong> " + domain + " </strong><em> " + reminder + "</em></li>";
    }
    console.log(blacklistSetup)
    document.getElementById("domainlist").innerHTML = blacklistSetup;
}

$(document).ready(function () {
    // Wird aufgerufen, sobald das Dokument geladen ist.
    "use strict";
    refreshBlacklist();
});


$(function () {
    $("#selectable").selectable();
});


loadBlacklist();

console.log("Setup.js finished");
