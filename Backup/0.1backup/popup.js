"use strict";
const me = "pop";
var myTab;
var pageLoaded = false;
var siteIsAvoided;
var paused;
var url;
var avoidDomain;
var reminder = "";
var pauseMessage = "pause";

console.log("Pop: Started ...................");
// Versuche externe js-Files einzubinden. Funktioniert aber alles nicht.
// $.getScript('./libraries/smw-blacklist.js', function() {});
//document.write('<script type="text/javascript" src="./libraries/smw-blacklist.js"></script>');
//    getBlacklist();





(function () {
// Diese Funktion wird sofort aufgerufen. (noch bevor die Seite fertig geladen ist.)

    // 1. Installiere einen Event-Listener für Messages
    chrome.runtime.onMessage.addListener(function (request, sender, respond) {
    // diese Funktion hört auf Messages, die im Chrome verteilt werden.
console.log("Pop: >>[", request.type, "] von", sender.tab ?
           "dem Content script:" + sender.tab.url :
           "der Extension");
        if (request.recv !== me) {return;}
        switch (request.type) {
                
            case "yourRole":
console.log("Pop: Ich habe eine Rolle bekommen:", request.role);
                activeRole = request.role;
                break;
            
                
            case "are-you-avoided-antwort":
                siteIsAvoided = request.avoid;
                avoidLevels   = request.avoidLevels;
console.log("Pop:  Seite avoided Antwort:", siteIsAvoided);
                
            default:
                return;
        }
    });
    return true;    
})();





    // 2. fragt die aktuelle Seite ob sie avoided ist
    // Sendet also eine Message an <content.js>
// Hier fliegt oft der Fehler: The message port closed before a response was received. WARUM?
console.log("Pop: Ask: Content.js if avoided.");
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
console.log("Pop: My own tab.id:", tabs[0].id);
        myTab = tabs[0];
        chrome.tabs.sendMessage(myTab.id, 
            {   type: "are-you-avoided?" 
            },
            function(response) {
console.log("Pop: Got Answer from Content.js");
                // Das ist jetzt die Callback-Funktion.
                if (response) {
                    siteIsAvoided = response.avoided;
                    avoidLevels   = response.avoidLevels;
                    reminder      = response.reminder;
                    avoidDomain   = response.avoidDomain;
console.log("Pop: Got: from Content.js - Avoided", siteIsAvoided, reminder, avoidLevels, avoidDomain);
                    gotLevels = true;
                    if (avoidLevels != undefined) { 
                        if (avoidLevels.reduce((a, b) => a + b, 0) > 0) {
                                showAvoidLevels = true;
                        }
                    }
                } else {
console.log("Pop: Got no useful answer from Content.js");
                }
                setAllAvoidLevelButtons();
            }
        );   
    });
 




//    $(document).ready(function () {   //jquery-Ausbau
    document.addEventListener("DOMContentLoaded", function(){
        // Wird aufgerufen sobald das Dokument geladen ist.
        // Binde die Module ein ...
console.log("Pop: Document ready");
        $("header").load("header.html");
        $("#toolbar").load("toolbar.html", function() {
console.log("Pop: CB Toolbar loaded OK.");
            toolbarLoaded = true;
            pageLoaded    = true;
            actualizeAvoidArea();
        
        });

        // übersetze die Seite
        localizeHtmlPage();
        
        chrome.tabs.query({
                'active': true,
                'currentWindow': true,
//                'windowId': chrome.windows.WINDOW_ID_CURRENT
            },
            function (tabs) {
                url = tabs[0].url;
console.log("Pop: Eigene Domain:", url);
        });
        
    });


function actualizeAvoidArea() {
    // Aktualisiert das AvoidArea abhängig davon ob die Seite avoided ist.
    // avoided heißt, dass ein Eintrag in der Datenbank besteht, auch wenn
    // aktuell die Rolle den avoidLevel auf 0 setzt.
console.log("Pop: actualizeAvoidArea: pageLoaded =", pageLoaded);
    if (pageLoaded) {
console.log("Pop: actualizeAvoidArea: siteAvoided =", siteIsAvoided);
        if (siteIsAvoided) {
console.log("Pop: actualizeAvoidArea: unavoidArea =",document.getElementById("unavoidArea"));
            document.getElementById("unavoidArea").style.display = "block";
console.log("Pop: actualizeAvoidArea: reminder =",document.getElementById("reminder"));
            document.getElementById("reminder").innerHTML = reminder;
            $('#buttonWhitelist').on('click', function () {
                chrome.extension.sendMessage({
                    type: 'whitelist-site',
                    url: url
                });
                window.close();
            });
            $('#buttonUnAvoid').on('click', function () {
                chrome.extension.sendMessage({
                    type: 'unavoid-site',
                    url: url
                });
                window.close();
            });
        } else {

console.log("Pop: actualizeAvoidArea: infoline =",document.getElementById("infoline"));
            document.getElementById("infoline").style.display = "block";
console.log("Pop: actualizeAvoidArea: avoidArea =",document.getElementById("avoidArea"));
            document.getElementById("avoidArea").style.display = "block";
            $('#buttonAvoid').on('click', function () {
                chrome.extension.sendMessage({
                    type: 'avoid-site',
                    url: url
                });
                window.close();
            });

        
        }
    }
}


function actualizeSmallButtons() {
    // Diese Funktion braucht's, da sie von toolbar.js aufgerufen wird. Wird aber
    // nur in showstopper.js verwendet. Hier nicht.
}

