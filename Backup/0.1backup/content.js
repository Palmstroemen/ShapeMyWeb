// Das Content.js Script wird für jeden TAB im Browser geladen. 
// Verbraucht also Speicher.
// Siehe: https://blog.flavia-it.de/chrome-extension-erstellen/
// Sollten wir eigentlich nicht brauchen, da wir nicht mit dem Content der
// jeweiligen Seiten interagieren wollen.
// Höchstens vielleicht einmal mit Google-Ergebnisseiten usw. wo wir vielleicht
// geblockte Seiten rot einfärbern wollen.
// Dazu kann man im manifest aber auch Seiten definieren für die das Content.js geladen wird. Dann wird es nicht für alle Seiten geladen. Auch gut.

"use strict";

var myUrl = window.location;
var myHostname = window.location.host;
var myDomain   = getMainDomain(myHostname);
var myPath     = window.location.pathname;
var avoidDomain= "";
var avoidLevels= [];
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

            case "show-avoid-screen!":
                let showResponse = true;
                if (!IamAvoided) {
console.log("SMW: Ich bin nicht avoided.");
                    showResponse = false;
                }

                reminder = request.reminder;
                if (reminder == undefined) {
console.log("SMW: Reminder ist undefined - bin offenbar nicht avoided.");
                    showResponse = false;
                }
                
                if (showResponse) {
                    let message = "was the reason why you wantend to avoid <strong>" + avoidDomain + "</strong><br><div class = 'shield' style='width: 50px, height: = 50px, border-radius: 25px, background: red'></div>";
                    showStopper(message, avoidDomain);
console.log("SMW:", avoidDomain, "Bitteschön - da ist er.");
                }

                respond(showResponse);
                break;
                
                
            case "you-are-avoided":
                reminder = request.reminder;
                if (reminder !== undefined) {
                    avoidDomain = request.avoidDomain;
    console.log("SMW: Man sagt mir, dass ich avoided bin.", avoidDomain);
                    if ((avoidDomain == myDomain) || (avoidDomain == myHostname)) {
                        avoidLevels = request.avoidLevels;
                        IamAvoided  = true;
    console.log(avoidDomain,"OK bin ich halt avoided.");
                    } else {
    console.log(avoidDomain,"Nein, habe eine andere Domain.", myDomain);
                        IamAvoided = false;
                    }
                } else { 
                    IamAvoided = false;
console.log("SMW: Ah gut, bin offenbar nicht avoided.");
                }
                respond(true);
                break;
                
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
                respond({ url: myUrl,
                         avoided: IamAvoided, 
                         avoidDomain: avoidDomain,
                         avoidLevels: retourAvoidLevels, 
                         reminder: reminder });
console.log("SMW: Na sage ich:", avoidDomain, IamAvoided, reminder);
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
                reminder    = reply.reminder;
                avoidLevels = reply.avoidLevels;
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
