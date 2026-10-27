// Functions to handle the Blacklist
console.log("smw-blacklist.js started");
var blReminder = {};
var blAvoidLevels = {};
var myExtensionIdBL = chrome.runtime.id;
var myPersonalIdBL  = chrome.i18n.getMessage("@@extension_id");


// Blacklist .........................................................


function loadBlacklist() {
    chrome.storage.sync.get({
        // liest die Blacklist aus dem Speicher aus.
        'reminders': blReminder,
        'roles': blAvoidLevels
    }, function () {
    });
}



function saveBlacklist() {
    // hier wird die Blacklist gespeichert
    chrome.storage.sync.set({
        'reminders': blReminder,
        'roles': blAvoidLevels
    }, function () {console.log("Blacklist updated.");});
}

function addToBlacklist(domain, reminder, avoidLevels) {
    // Fügt einen neuen Eintrag zur Blacklist hinzu und speichert die Blacklist gleich.
    blReminder[domain] = reminder;
    blAvoidLevels[domain] = avoidLevels;
    if (domain == myExtensionIdBL) {return; console.log("My ownDomain refused!!");}
    saveBlacklist();
console.log("Blacklist added:", domain);
};

// Add some democontent
addToBlacklist("derstandard.at", "zu viel bunt ist nicht gesunt.", [0, 1, 2, 3]);
addToBlacklist("diepresse.com", "zu konservativ.", [0, 1, 2, 3]);
addToBlacklist("youtube.com", "nix videoschaun.", [0, 1, 2, 3]);

function removeFromBlacklist(domain) {
    // Löscht den Eintrag aus der Balcklist.
    if (blReminder[domain] !== undefined) {
        blReminder[domain] == undefined;
        blAvoidLevels[domain] == [];
        saveBlacklist();
console.log("Blacklist removed:", domain);
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
    let [subDomains, domain] = splitUrl(url);
    if (domain == myExtensionIdBL) {return["memyselfandi", undefined, 0];}
console.log("checkBlacklist:", subDomains, domain, "____________");

    let reminder = blReminder[domain];
console.log("checkBlack rem:", domain, reminder);
    if (reminder != undefined) {
        avoidLevels = blAvoidLevels[domain];
        avoidLevel =  avoidLevels[activeRole];
console.log("checkBlack rol:", activeRole, "avoidLevel:", avoidLevel);
    };
    if ((reminder == undefined) || (avoidLevel == 0)) {
        // Wenn die Domains nicht anschlagen, prüfe noch die Subdomains
        reminder = blReminder[subDomains];
        if (reminder != undefined) {
            avoidLevel = blAvoidLevels[domain][activeRole];
            domain     = subDomains;
            entry      = true;
        } else {
        };
console.log("checkBlack sub:", domain, reminder, subDomains );
    };
console.log("checkBlack res:", domain, reminder, avoidLevel);
    resultFromBL.domain      = domain;
    resultFromBL.reminder    = reminder;
    resultFromBL.avoidLevels = avoidLevels;
    resultFromBL.entry       = entry;       // ist auch true wenn die der avoidLevel[activeRole] gerade 0 angibt. Dies gibt also an, ob ein Datenbankeintrag existiert. 
    return;
};

console.log("smw-blacklist.js finished");
