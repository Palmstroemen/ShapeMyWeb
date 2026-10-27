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

document.addEventListener("DOMContentLoaded", function () {
    chrome.runtime.sendMessage({ type: "getBlacklist" }, function (ans) {
        refreshBlacklist(ans.blacklist);
    });
});
