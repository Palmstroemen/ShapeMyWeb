// 
console.log("shapemyweb.js started");
var firstCall = true;
let mainDomain = "";
let subDomains = "";




$(document).ready(function () {
    "use strict";

    var avoidDomain;
    var reminder;

    // Wird aufgerufen sobald das Dokument geladen ist.
//    $("header").load("header.html");
    $("#toolbar").load("toolbar.html", function() {
        toolbarLoaded = true;
    });
    pageLoaded = true;
console.log("--- ShowStopper Seite geladen ---");

    $("sign").load("./libraries/sign.html");
    localizeHtmlPage();
console.log("--- und übersetzt");

    if (paused !== undefined) { actualizePause(paused) };


    let reminderEntrybox = document.getElementById("reminderEntrybox");

    chrome.extension.onMessage.addListener(function (request) {
        // Wartet auf Messages und führt sie dann aus.

console.log("smw Message received:", request.type);

        switch (request.type) {
            case "bg-smw-actualize":
                avoidDomain = request.url;
                [subDomains, mainDomain] = getDomain(avoidDomain);
                avoidDomain = mainDomain;
                document.getElementById("domain").innerHTML = mainDomain;
                if (subDomains !== mainDomain) {
                    document.getElementById("buttonSubdomain").innerHTML = "Avoid: " + subDomains;
                    document.getElementById("subdomainSection").style = "display: block";
                }
                break;
        }   
        return true;
    });
///////

    
    


    chrome.tabs.query({
            'active': true,
            'windowId': chrome.windows.WINDOW_ID_CURRENT
        },
        function (tabs) {}
    );

    document.getElementById("buttonSetup").addEventListener("click", function () {
        // Eventlistener für den Setup-Button.
        chrome.extension.sendMessage({
            type: 'setup'
        });
    });

    document.getElementById("buttonConfirm").addEventListener("click", function () {
        // Eventlistener für den Confirm-Button.
        let reminder = reminderEntrybox.value;
        chrome.extension.sendMessage({
            type: 'avoid-site-confirm',
            avoidDomain: avoidDomain,
            avoidLevel: [1, 1, 1, 1],
            reminder: reminder
        });
        window.close();
    });

    document.getElementById("buttonCancel").addEventListener("click", function () {
        // Eventlistener für den Cancle-Button
        window.close();
    });


    // Zur Darstellung von einigen Beispielsätzen in der Reminder-Box.
    var examplePhrases = [
        "Had a really bad customer experience. Never again!",
        "\n    Enter your Text here! ",
        "They do not treat their workers like I like it.",
        "\n    Remind yourself! ",
        "It takes my time and doesn't make me feel better.",
        "\n    Find yourself a good reason!"];
    var i = 0;
    var intervalID = window.setInterval(function () {
        if (i < 5) {
            i++;
        } else {
            i = 0;
        }
        reminderEntrybox.value = examplePhrases[i];
    }, 3000);

    // Sobald man in die Reminder-Box clickt soll diese gelöscht werden.
    reminderEntrybox.addEventListener("click", function () {
        if (firstCall == true) {
            window.clearInterval(intervalID);
            reminderEntrybox.value = "";
        }
    });

    reminderEntrybox.addEventListener("input", function () {
        firstCall = false;
    });

});



    function getHostName(url) {
        // identifiziert die gesmate Domain incl. Subdomains.
        if (url == undefined) {return null;}
        var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
        if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
            return match[2];
        } else {
            return null;
        }
    };

    function getDomain(url) {
        // identifiziert die mainDomain.
        var hostName = getHostName(url);
        var domain = hostName;

        if (hostName != null) {
            var parts = hostName.split('.').reverse();

            if (parts != null && parts.length > 1) {
                domain = parts[1] + '.' + parts[0];
                if ((parts.length > 2) && (parts[1].length < 3)) {  // für .ac.at 
                    domain = parts[2] + '.' + domain;
                }
            }
            // jetzt sollten in domain Dinge wie amazon.com oder tuwien.ac.at drin stehen.
            
            //if (domain == hostname) { hostname = "";}
        }

        return [hostName, domain];
    };


console.log("shapemyweb.js finished");
