"use strict";
const me = "pop";
var myUrl      = window.location.origin;
var currentUrl;
var myTab;
var pageLoaded = false;
var siteIsAvoided;
var paused;
var url;
var avoidDomain;
var subDomains;
var reminder = "";
var alternatives;
var pauseMessage = "pause";
var displayMode = 'normal';

var pauseTime;
var settings = {};
settings.showRole     = [1, 1, 1, 1];  // 0 .. zeige die Rolle nicht an, 1 .. zeige sie an.

var globalSettings = {};
var localSettings = {};


console.log("Pop: Started ...................");

// Diese Funktion wird sofort aufgerufen. (noch bevor die Seite fertig geladen ist.)
(function () {
    doImmediatelyBeforePageLoaded();
})();

// Mir ist nicht ganz klar, wann diese Funktionen aufgerufen werden.
askIfIamAvoided();

// Diese Funktionen werden aufgerufen, wenn die Seite geladen wurde.
doAfterPageLoaded();


///////////////////////////////////////////////////////////////////////////////


function doImmediatelyBeforePageLoaded() {
    // Diese Funktionen werden aufgerufen noch während die Seite lädt.
    installEventListenerForMessages();
}

function installEventListenerForMessages() {
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
}




function askIfIamAvoided() {
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
console.log("Pop: Got Answer from Content.js", response);
                // Das ist jetzt die Callback-Funktion.
                initDataFromResponse(myTab, response);
                setAllAvoidLevelButtons();
                showDomainInfo('edit');
                actualizeAvoidArea();
            }
        );   
    });   
}
 


function initDataFromResponse(myTab, response) {
    if (response) {
        siteIsAvoided = response.avoided;
        url           = response.url;
        avoidDomain   = response.avoidDomain;
        subDomains    = response.subDomains;
        reminder      = response.reminder;
        avoidLevels   = response.avoidLevels;
        alternatives  = response.alternatives;
console.log("Pop: Got: from Content.js - Avoided", siteIsAvoided, reminder, avoidLevels, avoidDomain);
        gotLevels     = true;
        if (avoidLevels != undefined) { 
            if (avoidLevels.reduce((a, b) => a + b, 0) > 0) {
                    showAvoidLevels = true;
            }
        }
    } else {
        siteIsAvoided = false;
        url           = myTab.url;
        avoidDomain   = undefined;
        subDomains    = undefined;
        reminder      = undefined;
        avoidLevels   = undefined;
        alternatives  = undefined;
        gotLevels     = false;
console.log("Pop: Got no useful answer from Content.js");
        askBackgroundIfTabIsAvoided(myTab);
    }
}

function askBackgroundIfTabIsAvoided(myTab) {
console.log('POP: ask Background if tab is avoided.');  
    chrome.runtime.sendMessage({
        type: "is-this-tab-avoided?",
        tab: myTab
    }, function (ans) {
        if (ans.AO) {
            url          = ans.AO.url;
            avoidDomain  = ans.AO.domain;
            subDomains   = ans.AO.subDomains;
            reminder     = ans.AO.reminder;
            avoidLevels  = ans.AO.avoidLevels;
            alternatives = ans.AO.alternatives;
            activeRole   = ans.role;
console.log('POP: ask Background callback.', ans);  
        } else {
            // Hier die Fehlerbehandlung
            console.log('POP: ERROR at ask Background: no valid answer.')
        }
    });
}


/// all das passiert sobald die Seite geladen wurde //////////////////////
function doAfterPageLoaded() {
    document.addEventListener("DOMContentLoaded", function(){
        // Wird aufgerufen sobald das Dokument geladen ist.
console.log("Pop: Document ready");
        addHeaderAndToolbar();          // fügt Header und Toolbar hinzu
        localizeHtmlPage();             // übersetze die Seite     
        currentUrl = getCurrentUrl();   // holt die URL des aktuellen Tabs
    });
}


//========================================================================
function addHeaderAndToolbar() {
    // Binde die Module ein ...
    $("header").load("header.html");
    $("#toolbar").load("toolbar.html", function() {
console.log("Pop: CB Toolbar loaded OK.");
        initButtons();
        initSetupButton();
        toolbarLoaded = true;
        pageLoaded    = true;        
    });
}

function initSetupButton() {
        document.getElementById('buttonSetup').addEventListener('click', function () { goToSetup(); });
}

function goToSetup() {
    chrome.extension.sendMessage({
        type: 'setup'
    });
    window.close();
};

function getCurrentUrl() {
    // Fragt die eigene URL ab
    chrome.tabs.query({
            'active': true,
            'currentWindow': true,
        },
        function (tabs) {
            return tabs[0].url;
console.log("Pop: Eigene Domain:", url);
console.log("Pop: Meine  Domain:", myUrl.origin);
    });
}

    
    
function actualizeAvoidArea() {
    // Aktualisiert das AvoidArea abhängig davon ob die Seite avoided ist.
    // avoided heißt, dass ein Eintrag in der Datenbank besteht, auch wenn
    // aktuell die Rolle den avoidLevel auf 0 setzt.
console.log("Pop: actualizeAvoidArea: pageLoaded =", pageLoaded);
    if (pageLoaded) {
console.log("Pop: actualizeAvoidArea: siteAvoided =", siteIsAvoided);
        if (siteIsAvoided) {
            document.getElementById("unavoidArea").style.display = "block";
            document.getElementById("reminder").innerHTML = reminder;
/*            
            document.getElementById('buttonWhitelist').addEventListener('click', function () {
                chrome.extension.sendMessage({
                    type: 'whitelist-site',
                    url: url
                });
                window.close();
            });
*/            
            document.getElementById('buttonUnAvoid').addEventListener('click', function () {
                chrome.extension.sendMessage({
                    type: 'unavoid-site',
                    url: url
                });
                window.close();
            });
        } else {

            document.getElementById("domainInfo").style.display = "block";
            document.getElementById("avoidArea").style.display = "block";
            document.getElementById('buttonAvoid').addEventListener('click', function () {
                chrome.extension.sendMessage({
                    type: 'avoid-site',
                    url: url
                });
                window.close();
            });

        
        }
    } else {
        setTimeout(actualizeAvoidArea, 20);
    }
}


function actualizeSmallButtons() {
    // Diese Funktion braucht's, da sie von toolbar.js aufgerufen wird. Wird aber
    // nur in showstopper.js verwendet. Hier nicht.
}


function sendChanges() {
    // Wird aufgerufen wenn der Confirm-Button gedrückt wird. 
    let AO = {};
    AO.domain       = avoidDomain;
    AO.subDomains   = subDomains;
    AO.reminder     = reminder;
    AO.avoidLevels  = avoidLevels;
    AO.alternatives = alternatives;
    chrome.extension.sendMessage({
        type: 'actualize-AO',
        tabId: myTab,
        avoid: AO
    });
};


