console.log("background.js started");

/*
const DefaultApiKey = "oz2erssx768cHfzDMOO1PsyIz2EaJsyDppqrwmHckoHsrGBOJ2tPkA==";
*/
const DomainExamineUrl = "https://www.vionika.com/services/examine/domain";
// dort steht: {"categories":[1011],"resultCode":0}
const DomainShapeYourWeb = "spinbrowse.com";
const DomainLocalhost = "localhost";
const MyDomain = "pmggapopacddeenjdfpmononbbmabpgg";

const RegexGoogle = /^(https?:\/\/)?(w{3}.)?(images.)?google./i;
const RegexYoutube = /^(https?:\/\/)?(w{3}.)?(.+.)?youtube./i;
const RegexBing = /^(https?:\/\/)?(w{3}.)?(.+.)?bing./i;
const RegexDuckDuckGo = /^(https?:\/\/)?(w{3}.)?(.+.)?duckduckgo./i;
const RegexYahoo = /^(https?:\/\/)?(w{3}.)?(.+.)?yahoo./i;

const AvoidedCategories = [1011, 1031, 1058, 1062, 10002, 10007];

var cachedCategories;
var clock = new Date();
var rewakeTime;
var activeRole = 1;


//////////////////
// Initialisierung, liest Daten aus dem lokalen Speicher aus
// FÜr den Pause-Mode gibt's eine Wiederaufwachzeit.
chrome.storage.local.get(['rewake'], function(res) {
    var storedTime = res.rewake;
    if (storedTime == undefined) {storedTime = 0;}
    rewakeTime     = storedTime;
});

// Die aktiveRolle wird auf dem Gerät und nicht in der Cloud gespeichert.
// so kann jedes Gerät eine andere aktive Rolle haben.
// z.B. Firmencomputer, Homecomputer, Tablet, ...
getRole();

function getRole() {
    chrome.storage.local.get(['role'], function(res) {
        var storedRole = res.role;
        if (storedRole == undefined) { storedRole = 0;}
        activeRole      = storedRole;
        return storedRole;
    });
};

function setRole(role) {
    activeRole = role;
    chrome.storage.local.set({
        'role': activeRole
    }, function () {
        activeRole = 5;
        getRole();
    });
};
//////////

chrome.webRequest.onBeforeRequest.addListener(
    // Diese Prüftung wird durchgeführt bevor eine neue Seite aufgerufen wird.
    function (details) {

        //////////////////        
        // Damit tut er nichts bis zur rewakeTime
        var time = clock.getTime();
        if (time < rewakeTime) {
            return null;
        }
        //////////        
        let urlString = details.url;
        let tabId = details.tabId;

        if (tabId >= 0 && urlString !== undefined) { // nur eine Sicherheitsabfrage

            //////////////////
            let result = checkBlacklist(urlString);
            // die Blackliste hat angeschlagen
            showWarning(result);
            //////////

            let safeSearchUrl = applySafeSearch(urlString); // hier ruft er eine eigene Funktion applySafeSearch auf (siehe unten)
            if (safeSearchUrl != urlString) {
                chrome.tabs.update(tabId, {
                    url: safeSearchUrl
                }); // hier geht er auf seine eigene Seite.
                return null; // und aus.
            }
            // Wenn er also applySafeSearch eine andere URL zurückgibt, geht er auf diese und stoppt.
            // Nur wenn applySafeSearch die gleiche Adresse zurückgibt, geht's weiter.



            let url = new URL(urlString);
            let domainName = url.hostname;

            // Remove www from the hostname
            if (domainName.indexOf('www.') === 0) {
                domainName = domainName.replace('www.', '');
            }

            if (domainName.length > 0 && (domainName.indexOf(DomainShapeYourWeb) == -1) && !domainName.startsWith(DomainLocalhost)) {
                let requestDomains = [];
                requestDomains.push(domainName);

                // Check params for urls
                let urlParams = url.searchParams;
                for (let paramKey of urlParams.keys()) {
                    let paramValue = urlParams.get(paramKey);
                    if (isValidURL(paramValue)) {
                        requestDomains.push(paramValue);
                    }
                }

                for (let requestDomain of requestDomains) {
                    let cachedDomainCategories = getDomainCategories(requestDomain);
                    if (cachedDomainCategories !== undefined) {
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
                        /*
                                                xhr.send(JSON.stringify({domainName: requestDomain, key: DefaultApiKey, v: "1"}));
                        */
                    }
                }
            }

        }

        return {
            cancel: false
        };
    }, {
        urls: ["<all_urls>"],
        types: ['main_frame']
    },
    ["blocking"]
);

chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
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

function blockTab(tabId, url, domainName, category) {
    let blockUrl = "http://www.spinbrowse.com/blocked/?url=" + url +
        "&domain=" + domainName +
        "&category=" + category +
        "&managed=false&os=web";

    chrome.tabs.update(tabId, {
        url: blockUrl
    }, _ => {
        let e = chrome.runtime.lastError;
        if (e !== undefined) {
            console.log(tabId, _, e);
        }
    });
}

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
    if (cachedCategories !== undefined) {
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



///////////////////////////////////////////////////////////////
// hier beginnen die selbst geschriebenen Funktionen.

var blReminder = {};
var blAvoidLevels = {};

initListeners();
function initListeners() {     
    "use strict";
    var myWindow;
    var myDocument;
    var fullDomain;
    var avoidDomain;
    var reminder;


    /**
     * listening for an event / one-time requests
     * coming from the popup
     */
    chrome.extension.onMessage.addListener(function (request) {
    // diese Funktion hört auf Messages, die im Chrome verteilt werden.
        
        switch (request.type) {
            case "avoid-site":
                fullDomain = request.fullDomain;
                
                myWindow   = window.open('shapemyweb.html', '_blank');
                myDocument = myWindow.$document;
                //myTab = chrome.tabs.create(url="shapemyweb.html");

                // Das nachfolgende Konstrukt wartet bis die neue Seite geladen ist und ruft dann die Aktualisierung auf.
                myWindow.onload = function () {
                    actualizer(fullDomain);
                }
                break;

            case "pause":
                var duration = prompt("For how many hours would you like to pause the service?", "1");
                if (duration != null) {
                    var hours = Number(duration);
                    if (hours > 0) {
                        rewakeTime = clock.getTime() + hours * 1000 * 3600;
                        chrome.storage.local.set({
                            'rewake': rewakeTime
                        }, function () {});
                    };
                };
                break;
                
            case "role":
                setRole(request.role - 1);
                break;

            case "setup":
                myWindow = window.open('smw-setup.html', "_blank");
                break;

            case "avoid-site-confirm":
                avoidDomain = request.avoidDomain;
                reminder = request.reminder;
console.log("avoid-site-confirm:", request.avoidDomain);
                addToBlacklist(avoidDomain, reminder, [0, 1, 2, 3]);
                
                var command = {
                    mSend: "bck",
                    mRecv: "cnt",
                    mType: "you-are-avoided",
                    mAvoidDomain: avoidDomain,
                    mReminder: reminder,
                    mAvoidLevels: [0, 1, 2, 3]
                };
                var callback = function() {};
                send2content(command, callback);
                break;

        }
        return true;
    });

    /**
     * send a message to my own freshly opened tab (shapemyweb.js)
     * @param {Object} msg
     * @param {String} msg.avoidDomain
     */
    var actualizer = function (msg) {
console.log("Actualizer");
        chrome.tabs.getSelected(null, function (myTab) {
            chrome.tabs.sendMessage(myTab.id, {
                type: "bg-smw-actualize",
                fullDomain: msg
            });
        });
    };
};


function send2content(kommando, callback) {
    // sendet eine Message an die content.js des aktuell geöffneten Tabs
    // Die Message muss das folgende Format haben: 
    //    { mSend: bck,
    //      mRecv: cnt,
    //      mType: message-type, 
    //      mParam1name: data, 
    //      mParam2name: data2, 
    //      ... }
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, 
            kommando, 
            callback
        );
    });    
};


function send2any(kommando, callback) {
    // sendet eine Message an alle anderen Komponenten der Extension ausser content.js
    // Die Message muss das folgende Format haben: 
    //    { mSend: bck,
    //      mRecv: cnt,
    //      mType: message-type, 
    //      mParam1name: data, 
    //      mParam2name: data2, 
    //      ... }
    chrome.tabs.sendMessage(
            kommando, 
            callback
    );
};    



function getHostName(url) {
    // identifiziert aus der URL die gesamte Domain samt Subdomains
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



function getBlacklist() {
    chrome.storage.sync.get({
        // liest die Blacklist aus dem Speicher aus.
        'reminders': blReminder,
        'roles': blAvoidLevels
    }, function () {
    });
}
getBlacklist();




function addToBlacklist(domain, reminder, avoidLevels) {
    // Fügt einen neuen Eintrag zur Blacklist hinzu und speichert die Blacklist gleich.
    blReminder[domain] = reminder;
    blAvoidLevels[domain] = avoidLevels;
    if (domain == MyDomain) {return; console.log("MyDomain refused!!");}

    // hier wird die Blacklist gespeichert
    chrome.storage.sync.set({
        'reminders': blReminder,
        'roles': blAvoidLevels
    }, function () {console.log("added to Blacklist:", domain);});

};

// Add some democontent
addToBlacklist("derstandard.at", "zu viel bunt ist nicht gesunt.", [0, 1, 2, 3]);
addToBlacklist("diepresse.com", "zu konservativ.", [0, 1, 2, 3]);
addToBlacklist("youtube.com", "nix videoschaun.", [0, 1, 2, 3]);


function checkBlacklist(url) {
    // Prüft, ob sich die Domain von url in der Blacklist findet.
    // Holt sich den RoleValue der angibt wie stark gewarnt werden soll.
    // Und gibt das Ergebnis des Checks zurück.
    let avoidLevel = 0;
    let [subDomains, domain] = getDomain(url);
    if (domain == MyDomain) {return["memyselfandi", undefined, 0];}
console.log("checkBlacklist:", subDomains, domain, "____________");

    let reminder = blReminder[domain];
console.log("checkBlack rem:", domain, reminder);
    if (reminder != undefined) {
        avoidLevel = blAvoidLevels[domain][activeRole];
console.log("checkBlack rol:", activeRole, blAvoidLevels);
    };
    if ((reminder == undefined) || (avoidLevel == 0)) {
        // Wenn die Domains nicht anschlagen, prüfe noch die Subdomains
        reminder = blReminder[subDomains];
        if (reminder != undefined) {
            avoidLevel = blAvoidLevels[domain][activeRole];
            domain = subDomains;
        };
console.log("checkBlack sub:", domain, reminder, subDomains );
    };
console.log("checkBlack res:", domain, reminder, avoidLevel);
    return [domain, reminder, avoidLevel];
};
    
function showWarning([domain, reminder, avoidLevel]) {    
    // Hier wird die Warnmeldung ausgegeben.
    if ((reminder != undefined) && (avoidLevel > 0)) {
        switch (avoidLevel) {
            case 2:
                break;

            default:
                alert("Du wolltest " + domain + "  vermeiden weil: \n\n" + reminder);
                break;
        };
    };
};
console.log("background.js finished");
