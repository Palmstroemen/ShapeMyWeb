// Das Content.js Script wird für jeden TAB im Browser geladen. 
// Verbraucht also Speicher.
// Siehe: https://blog.flavia-it.de/chrome-extension-erstellen/
// Sollten wir eigentlich nicht brauchen, da wir nicht mit dem Content der
// jeweiligen Seiten interagieren wollen.
// Höchstens vielleicht einmal mit Google-Ergebnisseiten usw. wo wir vielleicht
// geblockte Seiten rot einfärbern wollen.
// Dazu kann man im manifest aber auch Seiten definieren für die das Content.js geladen wird. Dann wird es nicht für alle Seiten geladen. Auch gut.

"use strict";

var myUrl      = window.location.href;
var myHostname = window.location.host;
var myDomain   = getMainDomain(myHostname);
var myPath     = window.location.pathname;
var avoidDomain= "";
var subDomains = [];
var avoidLevels= [];
var alternatives;
var activeRole = 0;
var reminder;
var IamAvoided = false;

console.log("SMW: content.js gestartet: ", myHostname);

//(function() {
/* Diese Art der Funktionsdefinition führt dazu, dass die Funktion
sofort nachdem sie im Code auftaucht ausgeführt wird. Also noch bevor der Code geparsed wird. Andererseits auch erst, wenn sie benötigt wird. */
console.log("SMW: content.js addListeners gestartet.");



    chrome.runtime.onMessage.addListener(function (request, sender, respond) {
console.log("SMW: >>[", request.type, "] von der Extension");
        
        switch (request.type) {

            case "update-avoidLevels!":
                avoidLevels = request.avoidLevels;
console.log("SMW: avoidLevels upgedated", avoidLevels);
                break;
                
                
            case "you-are-free":
                avoidDomain = request.avoidDomain;
                avoidLevels = request.avoidLevels;
                IamAvoided = false;
console.log("SMW: Ich höre, dass ich wieder frei bin.");
                respond(true);
                break;
                
                
            case "are-you-avoided?":
console.log("SMW: Ich werde gefragt, ob ich avoided bin:", avoidDomain);
                var retourAvoidLevels;
                if (IamAvoided) { retourAvoidLevels = avoidLevels; }
                else            { retourAvoidLevels = [0, 0, 0, 0];}
                respond({ url:         myUrl,
                         avoided:      IamAvoided, 
                         avoidDomain:  avoidDomain,
                         subDomains:   subDomains,
                         reminder:     reminder,
                         avoidLevels:  retourAvoidLevels, 
                         alternatives: alternatives
                        });
console.log("SMW: Na sage ich:", myUrl, avoidDomain, IamAvoided, reminder);
                break;
                
                
            case "setRole":
                setRole(request.role);
console.log("SMW: Role geändert auf:", request.role);
                break;

                
            case "pause-dialog":
                showPauseDialog();
                break;

            default:
console.log("SMW: content.js: unbekannte Nachricht");
                respond({ send: cnt,
                          error: "command not recognized." });
                break;
        }; 
    });
console.log("SMW: content.js addListeners fertig.");
//    return true;
//})();


// Frage mal die bck ob ich avoided bin.
if(window.location.host !== chrome.runtime.id) {
    chrome.runtime.sendMessage(
        {   type: "am-I-listed?",
            url: window.location.host
        }, 
            function(reply) {
                IamAvoided  = reply.avoidEntry;
                avoidDomain = reply.avoidDomain;
                subDomains  = reply.subDomains;
                reminder    = reply.reminder;
                avoidLevels = reply.avoidLevels;
                alternatives= reply.alternatives;
console.log("SMW: Antwort: am-I-listed?", avoidDomain, IamAvoided, reminder, avoidLevels);
            }
    );
console.log("SMW: Fragen : am-I-listed?", myHostname);
}


function getMainDomain(hostName) {
    if (hostName != null) {
        var domain = "";
        var parts = hostName.split('.').reverse();

        if (parts != null && parts.length > 1) {
            domain = parts[1] + '.' + parts[0];
            if ((parts.length > 2) && (parts[1].length < 3)) { // für .ac.at 
                domain = parts[2] + '.' + domain;
            }
        }
        // jetzt sollten in domain Dinge wie amazon.com oder tuwien.ac.at drin stehen.
    }
    return domain;

};

function setRole(role) {
    activeRole = role;
;}

console.log("SMW: content.js beendet: ");
console.log("SMW: Mein jetziger Avoided Status:", IamAvoided);
