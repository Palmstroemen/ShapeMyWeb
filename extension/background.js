console.log("BAC: background.js started");

let textOpacityDebug = 0;
const blockWebsite = "./showstopper.html";

var paused = false;
var resultFromBL = {};

var myExtensionId = chrome.runtime.id;

var settings = {textOpacity: 0.7, showRole: [ true, true, true, true ], pauseTime: 10};

var bl = {};
var tempWhitelist = {};
var myWindow;
var myDocument;
let tempAO;

var url;
var avoidDomain;
var reminder;
let alternatives;
  
var rewakeTime;
var activeRole = 1;
var keywordList = ["avoid", "block", "stop"];
var textOpacity = 0.7;




// Eventlisteners
chrome.webNavigation.onHistoryStateUpdated.addListener(checkWebsite);
chrome.webRequest.onBeforeRequest.addListener(checkWebsite, 
    { urls: ["<all_urls>"], types: ['main_frame'] }, ["blocking"] );
//chrome.omnibox.onInputStarted.addListener(function(text) {
// Damit könnte man in der Omnibox direkt etwas eingeben. Funktioniert aber noch nicht gescheit.
//    chrome.omnibox.setDefaultSuggestion();{description: "You can avoid this site."}
//})



// Initialisierung, liest Daten aus dem lokalen Speicher aus
// FÜr den  Pause-Mode gibt's eine Wiederaufwachzeit.
try {
    chrome.storage.local.get(['rewake'], function(res) {
        var storedTime = res.rewake;
        if (storedTime == undefined) {storedTime = 0;}
        rewakeTime     = storedTime;
            var time = new Date().getTime();
        if (time < rewakeTime) { console.log("BAC: Service aktuell pausiert", rewakeTime-time);}
        else                   { console.log("BAC: Service aktuell nicht pausiert");}
    });    
}
catch(error) {
    console.log('BAC: ERROR at crome.storage.local.get: ',error);  
    rewakeTime = 0;
}

// Die aktiveRolle wird auf dem Gerät und nicht in der Cloud gespeichert.
// so kann jedes Gerät eine andere aktive Rolle haben.
// z.B. Firmencomputer, Homecomputer, Tablet, ...
getRole();

loadSettings();

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
//(function()     
// dieser spezielle Funktionsaufruf führt dazu, dass diese Funktion SOFORT schon
// beim Laden des Dokumentes ausgeführt wird.
 
// Bin noch nicht sicher, ob das erforderlich ist.
// Es ist der Versuch die MessageListener so schnell wie möglich
// zu aktivieren. Gerade in der background.js sollte das eigentlich
// nicht nötig sein.
//{
    chrome.runtime.onMessage.addListener(function (request, sender, respond) {
    // diese Funktion hört auf Messages, die im Chrome verteilt werden.
console.log("BAC: >>[", request.type, "] von", sender.tab ?
           "dem Content script:/L" + sender.tab.url :
           "der Extension");
        
        switch (request.type) {
            case "avoid-site":
                url       = request.url;
                avoid_site(url);
                break;

            case "whom-do-I-avoid?":
                respond({
                    AO:        tempAO,
                    role:      activeRole,
                    mode:      "block",       // wird erwartet. (DEB01)
                    settings:  settings
                });
console.log("BAC: whom-do-I-avoid? activeRole:", activeRole, tempAO);
                break;
                
            case "is-this-tab-avoided?":
                let tab = request.tab;
console.log("BAC: is-this-tab-avoided:", tab);
        /////// hier eine BL-Abfrage einbauen.
                if (tab.id >= 0 && tab.url != undefined) { // nur eine Sicherheitsabfrage

                    let AOfromBL = checkBlacklist(tab.url);  
                    if (AOfromBL.domain != 'me') { 
                        respond({
                            AO:        AOfromBL,
                            role:      activeRole,
                            mode:      "block"       // wird erwartet. (DEB01)
                        });
                    }
                } else {
console.log("     no BL-check. (TabID<0 or url=undefined)");
                    respond({
                        AO:     undefined,
                        role:   activeRole,
                        mode:   "block"
                    });
                }

                
                break;

            case "actualize-AO":
console.log("BAC: actualize-AO:", request);
                actualizeBlacklist(request.avoid);
                break;
                
            case "unavoid-site": {
                url = request.url;
                avoidDomain = request.avoidDomain;
                let tabId   = request.tabId;
console.log("BAC: --unavoid", tabId, url, avoidDomain);
                removeFromBlacklist(avoidDomain);
                pause(0.01); // um der Blacklist Zeit zu lassen zum Löschen.
                updateTab(tabId, url);
                notifyTab("you-are-free", avoidDomain, undefined, []);
                break; }
            
            case "am-I-listed?":
                url = request.url;
console.log("BAC: I'll say:",    resultFromBL.entry, resultFromBL.reminder );
                respond({
                    avoidEntry:   resultFromBL.entry,
                    avoidDomain:  resultFromBL.domain,
                    subDomains:   resultFromBL.subDomains,
                    reminder:     resultFromBL.reminder,
                    avoidLevels:  resultFromBL.avoidLevels,
                    alternatives: resultFromBL.alternatives
                });
                break;
                
            case "whitelist-site!":
                url = request.url;
console.log("BAC: bck: add to Whitelist - not implemented yet.");
                break;
                
            case "pass-by!":
                let tabId  = request.tabId;
                let domain = request.url;
console.log("BAC: --pass by", tabId, domain);
                pause(0.2);
//                chrome.tabs.create({url: domain});
                updateTab(tabId, domain);
                break;
                
            case "pause":
                pause(settings.pauseTime);
                break;
                
            case "unpause":
                pause(-1);
                break;
                
            case "paused?":
                var time = new Date().getTime();
                if (time < rewakeTime) { respond({paused: true});
console.log("BAC: Antworte mit Pause aktiv", (rewakeTime - time)/1000.0, rewakeTime, time);}
                else                   { respond({paused:false}); 
console.log("BAC: Antworte mit Pause inaktiv");}                
                break;
                
            case "setRole":
                setRole(request.role);
                break;
                
            case "getRole": 
                var antwort = { type: "yourRole",
                                role: activeRole };
                respond( antwort);
                break; 
                
            case "setAvoidLevels":
                avoidDomain = request.avoidDomain;
                avoidLevels = request.avoidLevels;
console.log("BAC: setAvoidLevels", avoidDomain, avoidLevels);
                if (bl[avoidDomain] != undefined) {
                    bl[avoidDomain].avoidLevels = avoidLevels;
                    notifyTab("update-avoidLevels!", "X", "Y", avoidLevels);
                    saveBlacklist();
                }
                break;

            case "setup":
                myWindow = window.open('smw-setup.html', "_blank");
                break;
                
            case "saveSettings":
                settings = request.settings;
                saveSettings();
console.log("BAC: saveSettings:", settings );
                break;
                
            case "getSettings":
                var antwort = {
                    type: "settings",
                    settings: settings
                };
                respond( antwort);
console.log("BAC: getSettings:", settings );
                break;
                
            default:
                console.log("BAC: I received a unknown message:", request.type);

        }
        return true;
    });

    /**
     * send a message to my own freshly opened tab (shapemyweb.js)
     * @param {Object} msg
     * @param {String} msg.avoidDomain
     */
    var actualizeNewSite = function (msg) {
console.log("BAC: ActualizeNewTab");
        chrome.tabs.getSelected(null, function (myTab) {
            chrome.tabs.sendMessage(myTab.id, {
                type: "bg-smw-actualize",
                url: msg
            });
        });
    };
    
    chrome.runtime.onStartup.addListener(function(request) {
    // Wird nach einem Startup ausgeführt
console.log("BAC: Event: Startup.");        
    });

    chrome.runtime.onInstalled.addListener(function(request) {
    // Wird nach dem Installieren der Extension ausgeführt
console.log("BAC: Event: Installed.");        
        
    });

    chrome.runtime.onUpdateAvailable.addListener(function(request) {
    // Wird ausgeführt, wenn ein Update der Extension verfügbar ist.
console.log("BAC: Event: UpdateAvalable.");        
        
    });

    initBlacklist();
console.log('BAC: Add Democontent');
    addDemocontent(20);
console.log('BAC: Add Democontent finished');
    loadBlacklist();
 
//})();  // Dieses Konstrukt sollte man sich merken und evtl. wiedererkennen.
// Hier endet die Funktion, die SOFORT abgearbeitet wird.
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////


function checkWebsite(details) {
console.log(".");
console.log("BAC: ===== checkWebsite ====================================");
    // Das hier ist eine Callback-Funktion, da sie als Parameter dem Eventhandler übergeben wird. In "details" stehen dann die übergebenen
    // Parameter drin. Das sind so Dinge wie:
    //     details.url
    //     details.tabId
    let urlString = details.url;
    let tabId     = details.tabId;
    checkKeyword(urlString); // wenn "avoid" in die Omnibox eingegeben wird.
console.log("    TabID:", tabId, urlString);
    
    //////////////////  
    // Das ist für die PAUSE-Funktion
    // Damit tut er nichts bis zur rewakeTime
    var time = new Date().getTime();
    if (time < rewakeTime) { paused = true; } else { paused = false; }
    //////////        

    if (tabId >= 0 && urlString != undefined) { // nur eine Sicherheitsabfrage

        let resultFromBL = checkBlacklist(urlString);  
        if (resultFromBL.domain != 'me') { 
            showWarning(tabId, resultFromBL);
        }
    } else {
console.log("     no BL-check. (TabID<0 or url=undefined)");
    }

    return { cancel: false };
};



function avoid_site(url) {
    // initialisiert ein neues AO
    // öffnet den ShowStopper im Editmode
    // Editmode geht er, weil als reminder 'new' übergeben wird.
    tempAO = getNewAO(url);
console.log("BAC: avoid-site:", tempAO.url);
    updateTab(activeTab(), 'showstopper.html');
};

function pause(minutes) {
    // Pausiert das System indem es eine Rewaketime setzt.
    // Löschen der Pause mit: pause(-1)
    if (minutes != null) {
        if (minutes > 0) {
            rewakeTime = new Date().getTime() + minutes * 1000 * 60;
            chrome.storage.local.set({
                'rewake': rewakeTime
            }, function () {});
console.log("BAC: Pause aktiviert für ", minutes, "Minuten.", rewakeTime/1000);
        } else {
            rewakeTime = new Date().getTime() - 1;
            chrome.storage.local.set({
                'rewake': rewakeTime
            }, function () {});
console.log("BAC: Pause deaktiviert");
        }
    };
};

function getRole() {
    // Liest die globale activeRole aus dem lokalen Memory
    // (Sollte nur einmal nach Programmstart aufgerufen werden)
    try {
        chrome.storage.local.get(['role'], function(res) {
            var storedRole = res.role;
            if (storedRole == undefined) { storedRole = 0;}
            activeRole      = storedRole;
            return storedRole;
        });
    }
    catch (error) {
        storedRole = 0;
    }
};

function setRole(role) {
    // Schreibt die globale Variable activeRole in den lokalen Memory
    // (sollte nach einer Änderung der activeRole sofort aufgerufen werden)
    chrome.storage.local.set( { 'role': activeRole } );
    activeRole = role;
console.log("BAC: Rolle geändert auf:", role);
};

function saveSettings() {
    chrome.storage.local.set({ 
        'pauseTime': settings.pauseTime
    }, function () {});
    chrome.storage.sync.set({ 
        'justRiseAvoidLevels': settings.settingsJustRiseAvoidLevels,
        'textOpacity'          : settings.textOpacity,
        'showRole'             : settings.showRole,
        'justRiseAvoidLevels'  : settings.justRiseAvoidLevels,
        'noChangeToAvoidLevel0': settings.noChangeToAvoidLevel0
    }, function () {});
}

function loadSettings() {
    // Hier werden die globalen und lokalen Settings abgerufen.
    // global = gesynced über alle Devices,
    // local  = auf jedem Device extra gespeichert.
    let errorLocalStorage = false;
    try {
        chrome.storage.local.get(['pauseTime'], function(res) { settings.pauseTime  = res.pauseTime; });    
    }
    catch (error) {
        settings.pauseTime = 10;
        errorLocalStorage = true;
    }

    try {
        chrome.storage.sync.get(['textOpacity'], function(res) { settings.textOpacity = res.textOpacity; });
        chrome.storage.sync.get(['showRole'], function(res) { settings.showRole = res.showRole; });
        chrome.storage.sync.get(['justRiseAvoidLevels'], function(res) { settings.justRiseAvoidLevels = res.justRiseAvoidLevels; });
        chrome.storage.sync.get(['noChangeToAvoidLevel0'], function(res) { settings.noChangeToAvoidLevel0 = res.noChangeToAvoidLevel0; });
textOpacityDebug = settings.textOpacity;
console.log("BAC: loadSettings Opacity1: ", textOpacityDebug);
    }
    catch (error) {
        settings.showRole = undefined;
console.log("BAC: loadSettings Error1: ");
    }
    finally {
        if ((settings.showRole == undefined) || (errorLocalStorage)) { // Für den aller ersten Aufruf, wenn noch keine Settings gespeichert waren.
            settings.textOpacity = 0;
            settings.showRole = [1 , 1, 1, 1];
            settings.justRiseAvoidLevels = false;
            settings.noChangeToAvoidLevel0 = false;
            saveSettings();
    console.log("BAC: Settings error : ", settings);
        }
textOpacityDebug = settings.textOpacity;
console.log("BAC: loadSettings Opacity2: ", textOpacityDebug);
    }
console.log("BAC: Settings loaded: ", settings);
}


// Hier nun 2 Funktionen um Messages an andere Programmteile zu senden.
function send2any(kommando, callback) {
    // sendet eine Message an alle anderen Komponenten der Extension ausser content.js
    chrome.runtime.sendMessage(
        kommando, 
        callback
    );
};    

function send2content(kommando, callback) {
    // sendet eine Message an die content.js des aktuell geöffneten Tabs
console.log("BAC: <<[", kommando.type, "]");
    chrome.tabs.sendMessage(activeTab(), kommando, callback);
};

function notifyTab(type, domain, reminder, avoidLevels) {    
    // benachrichtigt die content.js, dass ihre Seite avoided ist.
    // Das ist z.B. erforderlich um das Popup anders darzustellen.
    // aber auch um der Showstopper Seite ihre Daten zu übergeben.
console.log("BAC: notify Tab", domain, reminder);
    if (domain === "me") return;
    if (domain == myExtensionId) return;
    var command = {
        type: type,
        avoidDomain: domain,
        reminder: reminder,
        avoidLevels: avoidLevels
    };
    var reply = function() {
        var lastError = chrome.runtime.lastError;
        if (lastError) {
            console.log("BAC: Error:" + lastError.message);
        }
    };
    try {
        // Das Problem hier ist, dass nach einem Neuladen der Extension die ganzen
        // bestehenden Tabs noch keine content.js laufen haben. Die kommt erst, wenn 
        // die jeweilige Seite neu lädt.
           send2content(command, reply);
        }
    catch(err) { 
console.log("BAC: ERROR notifyTab:", domain);
    }
}


function activeTab() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            return tabs[0].id;
        } else {
console.log("BAC: ERROR! Bekomme keinen aktiven Tab.")           
            return undefined;
        }
    });
}


function checkKeyword(url) {
    // überprüft ob die eingegebene URL ein Keyword ist
    // Die Omnibox gibt aber nicht einfach das eingegebene Wort zurück, 
    // sondern bereits eine GOOGLE-Suchanfrage. 
    // Oder je nach voreingestellter Suchmaschine eine jeweils andere.
    // also muss man dieses Keyword aus dieser Anfrage herausfiltern.
    let keyword = url.split("?q=");
    if (keyword.length > 1) {
        keyword = keyword[1].split("&");
        if (keywordList.includes(keyword[0])) {
console.log("BAC: Keyword erkannt:", keyword[0]);        
            var command = {
                send: "bck",
                recv: "cnt",
                type: "who-are-you?"
            };
console.log("BAC: Keyw. würde jetzt die SEite abfragen.");
            send2content(command, function(ans) {
                let url = ans.url;
                let avoided    = ans.avoided;
console.log("BAC: Tab tells me URL:", url);
                if (!avoided) {
                    avoid_site(url);
                } else {
console.log("BAC: Site is already avoided.")                    
                }
            });
        }
    }
}


// Blacklist .........................................................

function initBlacklist() {
    
}


function loadBlacklist() {
    chrome.storage.sync.get({
        // liest die Blacklist aus dem Speicher aus.
        'blackList': bl
    }, function () {
    });
}


function saveBlacklist() {
    // hier wird die Blacklist gespeichert
    chrome.storage.sync.set({ 'blackList': bl }, function () {
        console.log("BAC: Blacklist updated.", memorySizeOf(bl));
    });
}

///////////////////////////
function memorySizeOf(obj) {
    var bytes = 0;

    function sizeOf(obj) {
        if(obj !== null && obj !== undefined) {
            switch(typeof obj) {
            case 'number':
                bytes += 8;
                break;
            case 'string':
                bytes += obj.length * 2;
                break;
            case 'boolean':
                bytes += 4;
                break;
            case 'object':
                var objClass = Object.prototype.toString.call(obj).slice(8, -1);
                if(objClass === 'Object' || objClass === 'Array') {
                    for(var key in obj) {
                        if(!obj.hasOwnProperty(key)) continue;
                        sizeOf(obj[key]);
                    }
                } else bytes += obj.toString().length * 2;
                break;
            }
        }
        return bytes;
    };

    function formatByteSize(bytes) {
        if(bytes < 1024) return bytes + " bytes";
        else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KiB";
        else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MiB";
        else return(bytes / 1073741824).toFixed(3) + " GiB";
    };

    return formatByteSize(sizeOf(obj));
};
/////////////////////////////





function newBlackListEntry(domain, subDomains, reminder, avoidLevels, alternatives) {
    // Erzeugt ein neues AvoidObject AO.
    let AO = {};
    AO.domain       = domain;
    AO.subDomains   = subDomains;
    AO.reminder     = reminder;
    AO.avoidLevels  = avoidLevels;
    AO.alternatives = alternatives;
console.log("newAO reminder", AO.reminder);
    return AO;
};

function getNewAO(url) {
    let newAO          = {};
    newAO.url          = url;
    newAO.domain       = resultFromBL.domain;
    newAO.subDomains   = resultFromBL.subDomains;
    newAO.reminder     = "new";
    newAO.avoidLevels  = [1, 1, 1, 1];
    newAO.alternatives = [];
console.log('BAC: New AO created: ', newAO);
    return newAO;
}

function actualizeBlacklist(AO) {
    // Aktualisiert einen Eintrag der Blacklist und speichert die Blacklist gleich.
    // Fügt auch neue Einträge hinzu.
    let domain = AO.domain;
    if (domain == myExtensionId) { console.log("BAC: MyDomain refused to add to blacklist!!"); return; }
    tempAO = AO;

    delete AO.domain;  // Das wäre eine redundante Information
    bl[domain] = AO;
    saveBlacklist();
//console.log("BAC: Blacklist actualized:", AO);
};


// Add some democontent
function addDemocontent(number) {
    let dummySite;
    if (number>3) {
        for (var s=2; s<number/2; s++) {
            dummySite = 'youtube' + s + '.com';
            actualizeBlacklist(newBlackListEntry
                  (dummySite, ['story', 'service', 'fish'], "zu viel bunt ist nicht gesunt.", [0, 1, 2, 3], [newAlternative('https://www.orf.at'),  newAlternative('https://www.diepresse.at')]));
        }
    }
    actualizeBlacklist(newBlackListEntry
                  ("derstandard.at", ['story', 'service', 'fish'], "zu viel bunt ist nicht gesunt.", [0, 1, 2, 3], [newAlternative('https://www.orf.at'),  newAlternative('https://www.diepresse.at')]));
    actualizeBlacklist(newBlackListEntry
                  ("diepresse.com", [], "zu konservativ.", [0, 1, 2, 3], {}));
    actualizeBlacklist(newBlackListEntry
                  ("youtube.com", [], "nix videoschaun.", [0, 1, 2, 3], []));
    if (number>3) {
        for (var s=2; s<number/2; s++) {
            let dummySite = 'youtube' + (s+number/2) + '.com';
            actualizeBlacklist(newBlackListEntry
                  (dummySite, ['story', 'service', 'fish'], "zu viel bunt ist nicht gesunt.", [0, 1, 2, 3], [newAlternative('https://www.orf.at'),  newAlternative('https://www.diepresse.at')]));
        }
    }
}


function removeFromBlacklist(domain) {
    // Löscht den Eintrag aus der Balcklist.
console.log("BAC: Blacklist remove:", domain, bl[domain].reminder);
    if (bl[domain].reminder != undefined) {
        bl[domain].reminder  = undefined;
        bl[domain].subDomains = []; // damit werden alle subDomains gelöscht.
//        bl[domain].avoidLevels = [];  // damit merkt er sich die Einstellungen.
        saveBlacklist();
console.log("BAC: Blacklist removed:", domain);
    } else {
console.log("BAC: Blacklist remove error!!!!");        
    }
}


function checkBlacklist(url) {
    // Prüft, ob sich die Domain von url in der Blacklist findet.
    // Holt sich den RoleValue der angibt wie stark gewarnt werden soll.
    // Und gibt das Ergebnis des Checks zurück.
    let resultingAO = {};
    resultingAO.entry = undefined; // Zeichen nach aussen, dass gerade geprüft wird.
    resultingAO.domain       = "me";
    resultingAO.subDomains   = [];
    resultingAO.reminder     = undefined;
    resultingAO.avoidLevels  = [0, 0, 0, 0];
    resultingAO.alternatives = [];

    let avoidLevels  = [];
    let alternatives = [];
    let entry = false;
    let block = false;
    let [domain, subDomains] = splitUrl(url);
console.log('BAC: checkBlack:', domain);
    if (domain == myExtensionId || domain == 'extensions') {
console.log("BAC: checkBlack: das ist meine eigene Seite.")
        return resultingAO;
    }
console.log("BAC: checkBlack:", domain, subDomains, "____________");
    let subs = [];
    
    let foundEntry = bl[domain];
    if (foundEntry) {
        let found;
        subs  = foundEntry.subDomains;
        if (subs && (subs.length > 0)) { // kein Eintrag bedeutet ganze Seite sperren
            // Prüfe ob für den gefundenen Eintrag foundEntry Subdomains gespeichert sind. Dann sind nur diese Subdomans zu sperren. 
            for (var s=0; s<subs.length; s++) {
                found = subDomains.find(function(sub) {return sub == subs[s]});
                if ( found ) {
                    block = true;
                }
            }
        } else { block = true;
        };
        
        reminder     = foundEntry.reminder;
        avoidLevels  = foundEntry.avoidLevels;
        alternatives = foundEntry.alternatives;
        entry        = true;
    } else {
    };

    resultingAO.url          = url;
    resultingAO.domain       = domain;
    resultingAO.subDomains   = subs;
    resultingAO.reminder     = reminder;
    resultingAO.avoidLevels  = avoidLevels;
    resultingAO.alternatives = alternatives;
    resultingAO.block        = block;
    resultingAO.entry        = entry;       // ist auch true wenn der avoidLevel[activeRole] gerade 0 angibt. Dies gibt also an, ob ein Datenbankeintrag existiert. 
    return resultingAO;
};
    

function showWarning(tabId, result) {    
    // Hier wird die Warnmeldung ausgegeben.

    // Aber nicht an die eigenen Seiten.
    if (result.domain == "me")  return;
    if (paused)                 return;
    if (!result.block)          return;
    
    var avoidLevel = result.avoidLevels[activeRole];
    if ((result.reminder != undefined) && (avoidLevel > 0)) {
        switch (avoidLevel) {
            case 1:
                let domain = result.domain;
                var time = new Date().getTime();
                if (time < tempWhitelist[domain] ) return;
                
                tempWhitelist[domain] = time + 60000;
                blockTab(tabId, result);
                break;

            case 2:
                blockTab(tabId, result);
                break;

            case 3:
                blockTab(tabId, result);
                break;

                
            default:
                break;
        };
    };
};


function blockTab(tabId, result) {
    // Ruft statt der geplanten URL eine Sicherheitsurl in dem Tab auf.
    tempAO = result;
    updateTab(tabId, blockWebsite);
    chrome.history.deleteUrl(blockWebsite);
}


function updateTab(tabId, url) {
console.log("BAC: Update:", tabId, url);
    chrome.tabs.update(tabId, {
        url: url
    }, _ => {
        let e = chrome.runtime.lastError;
        if (e != undefined) {
            console.log(tabId, _, e);
        }
    });    
}


console.log("BAC: background.js finished");
