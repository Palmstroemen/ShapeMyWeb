console.log("SMW: background.js started");

/*
const DefaultApiKey = "oz2erssx768cHfzDMOO1PsyIz2EaJsyDppqrwmHckoHsrGBOJ2tPkA==";
*/
const blockWebsite = "./showstopper.html";
const DomainExamineUrl = "https://www.vionika.com/services/examine/domain";
// dort steht: {"categories":[1011],"resultCode":0}
const DomainShapeYourWeb = "spinbrowse.com";
const DomainLocalhost = "localhost";

const RegexGoogle = /^(https?:\/\/)?(w{3}.)?(images.)?google./i;
const RegexYoutube = /^(https?:\/\/)?(w{3}.)?(.+.)?youtube./i;
const RegexBing = /^(https?:\/\/)?(w{3}.)?(.+.)?bing./i;
const RegexDuckDuckGo = /^(https?:\/\/)?(w{3}.)?(.+.)?duckduckgo./i;
const RegexYahoo = /^(https?:\/\/)?(w{3}.)?(.+.)?yahoo./i;

const AvoidedCategories = [1011, 1031, 1058, 1062, 10002, 10007];

var cachedCategories;

var paused = false;
var resultFromBL = { domain: "", reminder: "", avoidLevels: [], entry: false };

/////////////////////
var myExtensionId = chrome.runtime.id;
var myPersonalId  = chrome.i18n.getMessage("@@extension_id");
////////////


// Eventlisteners
//chrome.omnibox.onInputStarted.addListener(function(text) {
    // Damit könnte man in der Omnibox direkt etwas eingeben. Funktioniert aber noch nicht gescheit.
//    chrome.omnibox.setDefaultSuggestion();{description: "You can avoid this site."}
//})

chrome.webNavigation.onHistoryStateUpdated.addListener(checkWebsite);

chrome.webRequest.onBeforeRequest.addListener(checkWebsite, 
    { urls: ["<all_urls>"], types: ['main_frame'] }, ["blocking"] );



function checkWebsite(details) {
console.log(".");
console.log("SMW: ===== checkWebsite ====================================");
    // Das hier ist eine Callback-Funktion, da sie als Parameter dem Eventhandler übergeben wird. In "details" stehen dann die übergebenen
    // Parameter drin. Das sind so Dinge wie:
    //     details.url
    //     details.tabId
    let urlString = details.url;
    let tabId     = details.tabId;
    checkKeyword(urlString); // wenn "avoid" in die Omnibox eingegeben wird.

    //////////////////  
    // Das ist für die PAUSE-Funktion
    // Damit tut er nichts bis zur rewakeTime
    var time = new Date().getTime();
    if (time < rewakeTime) { paused = true; } else { paused = false; }
    //////////        

    if (tabId >= 0 && urlString != undefined) { // nur eine Sicherheitsabfrage

        checkBlacklist(urlString);
        showWarning(tabId, resultFromBL);


/////////////////////////////////////////////////////////
// Das sind die Reste der ursprünglichen Extension zum 
// Blockieren von Pornoseiten.
// Das dient möglicherweise dazu um auch Suchergebnisse in Suchmaschinen auszublenden.
/*

        let safeSearchUrl = applySafeSearch(urlString); // hier ruft er eine eigene Funktion applySafeSearch auf (siehe unten)
        // Diese verändert offenbar den urlString, wenn ihr etwas nicht schmeckt.
        if (safeSearchUrl != urlString) {
            chrome.tabs.update(tabId, {
                url: safeSearchUrl
            }); // hier geht er auf seine eigene Seite.
            return null; // und aus.
        }
        // Wenn er also applySafeSearch eine andere URL zurückgibt, geht er auf seine eigene Seite "saveSearchUrl" und stoppt hier.
        // Nur wenn applySafeSearch die gleiche Adresse zurückgibt, geht's weiter.


        let url = new URL(urlString);
        let domainName = url.hostname;
        // jetzt hat er aus dem urlString eine echte URL gemacht
        // und sich daraus den domainName herausgekitzelt

        // Remove www from the hostname
        if (domainName.indexOf('www.') === 0) {
            domainName = domainName.replace('www.', '');
        }
        // Jetzt hat er das .wwww entfernt.

        if (domainName.length > 0 && (domainName.indexOf(DomainShapeYourWeb) == -1) && !domainName.startsWith(DomainLocalhost)) {
            let requestDomains = [];
            requestDomains.push(domainName);
            // in requestDomains steht jetzt z.B.
            // [ "neueSeite.com" ]

            // Check params for urls
            let urlParams = url.searchParams;
            for (let paramKey of urlParams.keys()) {
                let paramValue = urlParams.get(paramKey);
                if (isValidURL(paramValue)) {
                    // isValidURL prüft per Regex ob die übergebene
                    // url valide ist und gibt true/false zurück.
                    requestDomains.push(paramValue);
                }
            }
            // jetzt steht in requestDomains vielleicht
            // [ "neueSeite.com", true ]

            for (let requestDomain of requestDomains) {
                // merkwürdig ist diese Schleife, weil er hat ja
                // in requestDomains nur EINE Domain drin.
                let cachedDomainCategories = getDomainCategories(requestDomain);
                if (cachedDomainCategories != undefined) {
                    for (var category of cachedDomainCategories) {
                        if (AvoidedCategories.includes(category)) {
                            blockTab(tabId, url, requestDomain, category);
                            break;
                        }
                    }
                } else {
                    let xhr = new XMLHttpRequest();
                    xhr.open('POST', DomainExamineUrl, true);
                    xhr.setRequestHeader('Content-type', 'application/json');
                    xhr.setRequestHeader('Accept', 'application/json');

                    xhr.onload = function () {
                        let result = JSON.parse(xhr.response);
                        let categories = result["categories"];

                        saveDomainCategories(requestDomain, categories);

                        for (let category of categories) {
                            if (AvoidedCategories.includes(category)) {
                                blockTab(tabId, url, requestDomain, category);
                                break;
                            }
                        }
                    };

                                            xhr.send(JSON.stringify({domainName: requestDomain, key: DefaultApiKey, v: "1"}));

                }
            }
        }
*/                

    }

    return {
        cancel: false
    };
};

// Reste der ursprünglichen Extension //////////////////////
/*
chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
    // Das blockiert irgendwie zahlreiche Youtubevideos und insbesondere
    // die Kommentare dazu. Youtube zeigt dann Meldungen wie
    // "Im eingeschränkten Mode nicht verfügbar".
    
        if (RegexYoutube.test(details.url)) {
            details.requestHeaders.push({
                name: "YouTube-Restrict",
                value: "Strict"
            });
        }
        return {
            requestHeaders: details.requestHeaders
        };
    }, {
        urls: ['<all_urls>']
    },
    ['blocking', 'requestHeaders']
);



function applySafeSearch(url) {
    // Hier wird geprüft ob die übergebene URL eine sichere URL ist.
    // Offenbar geht er hier einige Suchmaschinen durch und prüft, ob diese die Seite als "safe" einstufen.
    // Wenn die Suche anschlägt, wird an die URL etwas angehängt.
    // Das Geheimnis liegt irgendwie in den Funktionen: GoogleSearchRegex.test(), BingSearchRegex.test(), usw.
    // NEIN, weil das sind keine Funktionen, sondern hier vordefinierte KONSTANTEN!!

    if (RegexGoogle.test(url)) { // Google
        // Damit prüft er aber nur, ob URL etwa die Form "http://www.images.google./i" oder auch nur google. hat.
        if (!url.includes("safe=strict") && !url.includes("/maps/") && !url.includes("/gmail") && !url.includes("/amp/")) {
            if (url.includes("?") || url.includes("#")) {
                return url + "&safe=strict";
            } else {
                return url + "?safe=strict";
            }
        }
    } else if (RegexBing.test(url)) { // Bing
        if (!url.includes("adlt=strict") && !url.includes(".js")) {
            if (url.includes("?")) {
                return url + "&adlt=strict";
            } else {
                return url + "?adlt=strict";
            }
        }
    } else if (RegexDuckDuckGo.test(url)) { // DuckDuckGo
        if (!url.includes("kp=1")) {
            if (url.includes("?")) {
                return url + "&kp=1";
            } else {
                return url + "?kp=1";
            }
        }
    } else if (RegexYahoo.test(url)) { // Yahoo
        if (!url.includes("vm=r")) {
            if (url.includes("?")) {
                return url + "&vm=r";
            } else {
                return url + "?vm=r";
            }
        }
    }

    return url;
}

function getDomainCategories(domain) {
    if (cachedCategories === undefined) {
        chrome.storage.local.get(["cachedCategories"],
            function (result) {
                var items = result["cachedCategories"];
                if (items === undefined) {
                    cachedCategories = {};
                } else {
                    cachedCategories = items;
                }
            });
    } else {
        return cachedCategories[domain];
    }
}

function saveDomainCategories(domain, categories) {
    if (cachedCategories != undefined) {
        cachedCategories[domain] = categories;

        chrome.storage.local.set({
            "cachedCategories": cachedCategories
        }, function () {});
    }
}

function isValidURL(string) {
    let res = string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    if (res == null)
        return false;
    else
        return true;
};
*/

// Das sind globale Variable, die hier nur kurz gespeichert werden.
// Die Funktion blockTab() ruft die eigene Blockierseite auf und die fragt
// dann nach whom-do-I-avoid?. Dort werden dann diese Variablen übergeben.
let aUrl;
let aDomain;
let aSubDomains;
let aReminder;
let aLevels;


function blockTab(tabId, result) {
    // Ruft statt der geplanten URL eine Sicherheitsurl in dem Tab auf.
    let blockUrl = blockWebsite;
    aUrl        = result.url;
    aDomain     = result.domain;
    aSubDomains = result.subDomains; // das sind die Subs, die bereits avoided werden.
    aReminder   = result.reminder;
    aLevels     = result.avoidLevels;
    updateTab(tabId, blockUrl);
}

function updateTab(tabId, url) {
console.log("SMW: Update:", tabId, url);
    chrome.tabs.update(tabId, {
        url: url
    }, _ => {
        let e = chrome.runtime.lastError;
        if (e != undefined) {
            console.log(tabId, _, e);
        }
    });    
}







///////////////////////////////////////////////////////////////
// hier beginnen die selbst geschriebenen Funktionen.

var bl = {};
var tempWhitelist = {};
var myWindow;
var myDocument;
var url;
var avoidDomain;
var reminder;
  
var rewakeTime;
var activeRole = 1;
var keywordList = ["avoid", "block", "stop"];


// Initialisierung, liest Daten aus dem lokalen Speicher aus
// FÜr den Pause-Mode gibt's eine Wiederaufwachzeit.
chrome.storage.local.get(['rewake'], function(res) {
    var storedTime = res.rewake;
    if (storedTime == undefined) {storedTime = 0;}
    rewakeTime     = storedTime;
        var time = new Date().getTime();
    if (time < rewakeTime) { console.log("SMW: Service aktuell pausiert", rewakeTime-time);}
    else                   { console.log("SMW: Service aktuell nicht pausiert");}

});

// Die aktiveRolle wird auf dem Gerät und nicht in der Cloud gespeichert.
// so kann jedes Gerät eine andere aktive Rolle haben.
// z.B. Firmencomputer, Homecomputer, Tablet, ...
getRole();


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
console.log("SMW: >>[", request.type, "] von", sender.tab ?
           "dem Content script:/L" + sender.tab.url :
           "der Extension");
        
        switch (request.type) {
            case "avoid-site":
                url       = request.url;
console.log("SMW: avoid-site:", aUrl);
                avoid_site(url);
                break;

            case "whom-do-I-avoid?":
                respond({
                    url: aUrl,
                    avoidDomain: aDomain,
                    subDomains: aSubDomains,
                    reminder: aReminder,
                    avoidLevels: aLevels,
                    role: activeRole
                });
console.log("SMW: whom-do-I-avoid? activeRole:", activeRole, aLevels, "N:", aSubDomains);
                break;

            case "avoid-site-confirm":
console.log("SMW: avoid-site-confirm:", request);
                addToBlacklist(request.avoid);
                break;
                
            case "unavoid-site": {
                url = request.url;
                avoidDomain = request.avoidDomain;
                let tabId   = request.tabId;
console.log("SMW: --unavoid", tabId, url, avoidDomain);
                removeFromBlacklist(avoidDomain);
                pause(0.01); // um der Blacklist Zeit zu lassen zum Löschen.
                updateTab(tabId, url);
                notifyTab("you-are-free", avoidDomain, undefined, []);
                break; }
            
            case "am-I-listed?":
                url = request.url;
console.log("SMW: I'll say:",    resultFromBL.entry );
                respond({
                    avoidEntry:  resultFromBL.entry,
                    avoidDomain: resultFromBL.domain,
                    reminder:    resultFromBL.reminder,
                    avoidLevels: resultFromBL.avoidLevels
                });
                break;
                
            case "whitelist-site!":
                url = request.url;
console.log("SMW: bck: add to Whitelist - not implemented yet.");
                break;
                
            case "pass-by!":
                let tabId  = request.tabId;
                let domain = request.url;
console.log("SMW: --pass by", tabId, domain);
                pause(0.2);
//                chrome.tabs.create({url: domain});
                updateTab(tabId, domain);
                break;
                
            case "pause":
                let minutes = request.minutes;
                pause(minutes);
                break;
                
            case "unpause":
                pause(-1);
                break;
                
            case "paused?":
                var time = new Date().getTime();
                if (time < rewakeTime) { respond({paused: true});
console.log("SMW: Antworte mit Pause aktiv", (rewakeTime - time)/1000.0, rewakeTime, time);}
                else                   { respond({paused:false}); 
console.log("SMW: Antworte mit Pause inaktiv");}                
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
console.log("SMW: setAvoidLevels", avoidDomain, avoidLevels);
                if (bl[avoidDomain] != undefined) {
                    bl[avoidDomain].avoidLevels = avoidLevels;
                    notifyTab("update-avoidLevels!", "X", "Y", avoidLevels);
                    saveBlacklist();
                }
                break;

            case "setup":
                myWindow = window.open('smw-setup.html', "_blank");
                break;

                
            default:
                console.log("SMW: I received a unknown message:", request.type);

        }
        return true;
    });

    /**
     * send a message to my own freshly opened tab (shapemyweb.js)
     * @param {Object} msg
     * @param {String} msg.avoidDomain
     */
    var actualizeNewSite = function (msg) {
console.log("SMW: ActualizeNewTab");
        chrome.tabs.getSelected(null, function (myTab) {
            chrome.tabs.sendMessage(myTab.id, {
                type: "bg-smw-actualize",
                url: msg
            });
        });
    };
    
    chrome.runtime.onStartup.addListener(function(request) {
    // Wird nach einem Startup ausgeführt
console.log("SMW: Event: Startup.");        
    });

    chrome.runtime.onInstalled.addListener(function(request) {
    // Wird nach dem Installieren der Extension ausgeführt
console.log("SMW: Event: Installed.");        
        
    });

    chrome.runtime.onUpdateAvailable.addListener(function(request) {
    // Wird ausgeführt, wenn ein Update der Extension verfügbar ist.
console.log("SMW: Event: UpdateAvalable.");        
        
    });

 
//})();  // Dieses Konstrukt sollte man sich merken und evtl. wiedererkennen.
// Hier endet die Funktion, die SOFORT abgearbeitet wird.
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////


// Hier nun 2 Funktionen um Messages an andere Programmteile zu senden.
function send2any(kommando, callback) {
    // sendet eine Message an alle anderen Komponenten der Extension ausser content.js
    // Die Message muss das folgende Format haben: 
    //    { send: bck,
    //      recv: cnt,
    //      type: message-type, 
    //      param1name: data, 
    //      param2name: data2, 
    //      ... }
    chrome.runtime.sendMessage(
            kommando, 
            callback
    );
};    

function send2content(kommando, callback) {
    // sendet eine Message an die content.js des aktuell geöffneten Tabs
    // Die Message muss das folgende Format haben: 
    //    { send: bck,
    //      recv: cnt,
    //      type: message-type, 
    //      param1name: data, 
    //      param2name: data2, 
    //      ... }
console.log("SMW: <<[", kommando.type, "]");
    chrome.tabs.sendMessage(activeTab(), kommando, callback);
};


function activeTab() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs) {
            return tabs[0].id;
        } else {
console.log("SMW: send2content ERROR. Bekomme keinen aktiven Tab.")           
            return undefined;
        }
    });
}


function getRole() {
    // Liest die globale activeRole aus dem lokalen Memory
    // (Sollte nur einmal nach Programmstart aufgerufen werden)
    chrome.storage.local.get(['role'], function(res) {
        var storedRole = res.role;
        if (storedRole == undefined) { storedRole = 0;}
        activeRole      = storedRole;
        return storedRole;
    });
};

function setRole(role) {
    // Schreibt die globale Variable activeRole in den lokalen Memory
    // (sollte nach einer Änderung der activeRole sofort aufgerufen werden)
    chrome.storage.local.set( { 'role': activeRole } );
    activeRole = role;
console.log("SMW: Rolle geändert auf:", role);
    
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // Eigentlich müsste diese Information jetzt an alle offenen Tabs verteilt werden.
    // Anderenfalls müsste vor jeder Prüfung die activeRoleLevel abgefragt werden.
};

function pause(minutes) {
    // Pausiert das System indem es eine Rewaketime setzt.
    if (minutes != null) {
        if (minutes > 0) {
            rewakeTime = new Date().getTime() + minutes * 1000 * 60;
            chrome.storage.local.set({
                'rewake': rewakeTime
            }, function () {});
console.log("SMW: Pause aktiviert für ", minutes, "Minuten.", rewakeTime/1000);
        } else {
            rewakeTime = new Date().getTime() - 1;
            chrome.storage.local.set({
                'rewake': rewakeTime
            }, function () {});
console.log("SMW: Pause deaktiviert");
        }
    };
};

function avoid_site(url) {
    // öffnet den ShowStopper im Editmode
    // Editmode geht er, weil als reminder 'new' übergeben wird.
    aUrl      = url;
    aDomain   = "new";
    aReminder = "new"; // Damit öffnet er den ShowStopper im Edit-Mode
    aLevels   = [1, 1, 1, 1]; // Defaulteinstellung
    aSubDomains = result.subDomains;

    updateTab(activeTab(), 'showstopper.html');
};

/*
function avoid_site_old(url) {
    // Wird aufgerufen, wenn die Seite "url" avoided werden soll.
    myWindow   = window.open('shapemyweb.html', '_blank');
    myDocument = myWindow.$document;
    //myTab = chrome.tabs.create(url="shapemyweb.html");

    // Das nachfolgende Konstrukt wartet bis die neue Seite geladen ist und sendet ihr dann die Domain.
    myWindow.onload = function () {
console.log("SMW: bck: ActualizeNewTab");
        chrome.tabs.getSelected(null, function (myTab) {
            chrome.tabs.sendMessage(myTab.id, {
                type: "bg-smw-actualize",
                url: url
            });
        });
    };
};
*/
function notifyTab(type, domain, reminder, avoidLevels) {    
    // benachrichtigt die content.js, dass ihre Seite avoided ist.
    // Das ist z.B. erforderlich um das Popup anders darzustellen.
    // aber auch um der Showstopper Seite ihre Daten zu übergeben.
console.log("SMW: D:", domain, "R:", reminder);
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
            console.log("SMW: Error:" + lastError.message);
        }
    };
    try {
        // Das Problem hier ist, dass nach einem Neuladen der Extension die ganzen
        // bestehenden Tabs noch keine content.js laufen haben. Die kommt erst, wenn 
        // die jeweilige Seite neu lädt.
           send2content(command, reply);
        }
    catch(err) { 
console.log('SMW: ERROR notifyTab:', domain);
    }
}

function checkKeyword(url) {
    // überprüft ob die eingegebene URL ein Keyword ist
    // Die Omnibox gibt aber nicht einfach das eingegebene Wort zurück, 
    // sondern bereits eine GOOGLE-Suchanfrage. 
    // Oder je nach voreingestellter Suchmaschine eine jeweils andere.
    // also muss man dieses Keyword aus dieser Anfrage herausfiltern.
    let spliturl = url.split("?q=");
    if (spliturl.length > 1) {
        spliturl = spliturl[1].split("&");
        if (keywordList.includes(spliturl[0])) {
console.log("SMW: Keyword erkannt:", spliturl[0]);        
            var command = {
                send: "bck",
                recv: "cnt",
                type: "who-are-you?"
            };
console.log("SMW: Keyw. würde jetzt die SEite abfragen.");
            send2content(command, function(ans) {
                let url = ans.url;
                let avoided    = ans.avoided;
console.log("SMW: Tab tells me URL:", url);
                if (!avoided) {
                    avoid_site(url);
                } else {
console.log("SMW: Site is already avoided.")                    
                }
            });
        }
    }
}

/*
function getHostName(url) {
    // identifiziert aus der URL die gesamte Domain samt Subdomains
    // input: "https://www.asubdomain.adomain.com/afolder/asubfolder?pfwoifuasfasd"
    // output: "asubdomain.adoumain.com"
    var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
    if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
        return match[2];
    } else {
        return null;
    }
}

function getDomain(url) {
    // identifiziert die mainDomain ohne Subdomains.
    var hostName = getHostName(url);
    var domain = hostName;

    if (hostName != null) {
        var parts = hostName.split('.').reverse();

        if (parts != null && parts.length > 1) {
            domain = parts[1] + '.' + parts[0];
            if ((parts.length > 2) && (parts[1].length < 3)) { // für .ac.at 
                domain = parts[2] + '.' + domain;
            }
        }
        // jetzt sollten in domain Dinge wie amazon.com oder tuwien.ac.at drin stehen.

        //if (domain == hostname) { hostname = "";}
    }

    return [hostName, domain];
}

*/

// Blacklist .........................................................

function initBlacklist() {
    bl.avoidedSites = 0;
    bl.alternatives = {};
}
initBlacklist();


function loadBlacklist() {
    chrome.storage.sync.get({
        // liest die Blacklist aus dem Speicher aus.
        'blackList': bl
    }, function () {
    });
}
loadBlacklist();


function saveBlacklist() {
    // hier wird die Blacklist gespeichert
    chrome.storage.sync.set({
        'blackList': bl
    }, function () {console.log("SMW: Blacklist updated.");});
}

function newAO(domain, subDomains, reminder, avoidLevels, alternatives) {
    // Erzeugt ein neues AvoidObject AO.
    let AO = {};
    AO.domain       = domain;
    AO.reminder     = reminder;
    AO.subDomains   = subDomains;
    AO.avoidLevels  = avoidLevels;
    AO.alternatives = alternatives;
    return AO;
};


function addToBlacklist(AO) {
    // Fügt einen neuen Eintrag zur Blacklist hinzu und speichert die Blacklist gleich.
    let domain = AO.domain;
    if (domain == myExtensionId) { console.log("SMW: MyDomain refused to add to blacklist!!"); return; }

    delete AO.domain;
    bl[domain] = AO;
    bl.avoidedSites += 1;
    saveBlacklist();
console.log("SMW: Blacklist added:", domain, bl[domain].reminder);
};


// Add some democontent
addToBlacklist(newAO("derstandard.at", ['sory', 'service', 'fish'], "zu viel bunt ist nicht gesunt.", [0, 1, 2, 3], {}));
addToBlacklist(newAO("diepresse.com", [], "zu konservativ.", [0, 1, 2, 3], {}));
addToBlacklist(newAO("youtube.com", [], "nix videoschaun.", [0, 1, 2, 3], {}));


function removeFromBlacklist(domain) {
    // Löscht den Eintrag aus der Balcklist.
console.log("SMW: Blacklist remove:", domain, bl[domain].reminder);
    if (bl[domain].reminder != undefined) {
        bl[domain].reminder  = undefined;
        bl[domain].subDomains = []; // damit werden alle subDomains gelöscht.
//        bl[domain].avoidLevels = [];  // damit merkt er sich die Einstellungen.
        bl.avoidedSites -= 1;
        saveBlacklist();
console.log("SMW: Blacklist removed:", domain);
    } else {
console.log("SMW: Blacklist remove error!!!!");        
    }
}


function checkBlacklist(url) {
    // Prüft, ob sich die Domain von url in der Blacklist findet.
    // Holt sich den RoleValue der angibt wie stark gewarnt werden soll.
    // Und gibt das Ergebnis des Checks zurück.
    resultFromBL.entry = undefined; // Zeichen nach aussen, dass gerade geprüft wird.
    let avoidLevels = [];
    let avoidLevel = 0;
    let entry = false;
    let [domain, subDomains, search] = getDomain(url);
    if (domain == myExtensionId || domain == 'extensions') {
console.log("SMW: ceckBlack: das ist meine eigene Seite.")
        resultFromBL.domain      = "me";
        resultFromBL.subDomains  = {};
        resultFromBL.reminder    = undefined;
        resultFromBL.avoidLevels = [0, 0, 0, 0];
        return;
    }
console.log("SMW: checkBlack:", domain, subDomains, "____________");
    let subs = [];
    let foundEntry = bl[domain];
    if (foundEntry) {
        let found;
        let block    = false;
        subs  = foundEntry.subDomains;
        if (subs && subs.length > 0) { // kein Eintrag bedeutet ganze Seite sperren
            // Prüfe ob für den gefundenen Eintrag foundEntry Subdomains gespeichert sind. Dann sind nur diese Subdomans zu sperren. 
            for (var s=0; s<subs.length; s++) {
                found = subDomains.find(function(sub) {return sub == subs[s]});
                if ( found ) {
console.log("SMW: checkBlack sub:", domain, subs[s]);
                    block = true;
                }
            }
        } else { block = true };
        
        if (block) {
            reminder     = foundEntry.reminder;
            avoidLevels  = foundEntry.avoidLevels;
            avoidLevel   = avoidLevels[activeRole];
            entry        = true;
        }
    };
console.log("SMW: checkBlack res:", domain, reminder, avoidLevel, entry);

    resultFromBL.url         = url;
    resultFromBL.domain      = domain;
    resultFromBL.subDomains  = subs;
    resultFromBL.reminder    = reminder;
    resultFromBL.avoidLevels = avoidLevels;
    resultFromBL.entry       = entry;       // ist auch true wenn die der avoidLevel[activeRole] gerade 0 angibt. Dies gibt also an, ob ein Datenbankeintrag existiert. 
    return;
};
    


function showWarning(tabId, result) {    
    // Hier wird die Warnmeldung ausgegeben.

    // Aber nicht an die eigenen Seiten.
    if (result.domain == "me") return;
    if (paused) return;
    
    var avoidLevel = result.avoidLevels[activeRole];
console.log("SMW: showWarning.", activeRole, result.avoidLevels, avoidLevel);
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
console.log('SMW: showWarning: False avoidLevel')
                break;
        };
    };
};
console.log("SMW: background.js finished");
