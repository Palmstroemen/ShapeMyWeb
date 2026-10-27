// Die Setup-Seite: listet alle Einträge der Blacklist auf.
"use strict";

function refreshBlacklist(bl) {
    let blacklistSetup = "";
    for (let domain of Object.keys(bl).sort()) {
        let entry    = bl[domain];
        let avoided  = entry.reminder !== undefined;
        let subs     = (entry.subDomains ?? []).join(', ');
        let levels   = (entry.avoidLevels ?? []).join(' / ');
        blacklistSetup += "<li class='" + (avoided ? "" : "inactive") + "'>"
                        + "<strong>" + escapeHtml(domain) + "</strong> "
                        + "<em>" + escapeHtml(avoided ? entry.reminder : "(nicht aktiv)") + "</em>"
                        + "<div class='details'>"
                        + (subs ? "Bereiche: " + escapeHtml(subs) + " · " : "")
                        + "Levels: " + escapeHtml(levels)
                        + "</div></li>";
    }
    document.getElementById("domainlist").innerHTML = blacklistSetup || "<li><em>–</em></li>";
}

function initDesignSetup(settings) {
    // Umschalter zwischen Stoppschild und ruhigem Design
    document.getElementById(settings.design == 'calm' ? 'setupDesignCalm' : 'setupDesignClassic').checked = true;
    for (let radio of document.querySelectorAll('input[name="design"]')) {
        radio.addEventListener('change', function () {
            settings.design = this.value;
            chrome.runtime.sendMessage({ type: "saveSettings", settings: settings });
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    localizeHtmlPage();
    chrome.runtime.sendMessage({ type: "getSettings" }, function (ans) {
        initDesignSetup(ans.settings);
    });
    chrome.runtime.sendMessage({ type: "getBlacklist" }, function (ans) {
        refreshBlacklist(ans.blacklist);
    });
});
