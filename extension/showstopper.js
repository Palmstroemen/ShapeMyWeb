// Das ist die Webseite, die gezeigt wird, wenn eine Seite vermieden werden soll.
"use strict";
var myExtensionId = chrome.runtime.id;

var pageLoaded = false;
var toolbarLoaded = false;
var siteIsAvoided;
var paused;
var url;
var avoidDomain;
var subDomains;        // das sind Subdomains, die bereits avoided werden.
var reminder     = "";
var avoidLevels  = [0, 0, 0, 0];
var activeRole   = 100;
var alternatives = [];
var newAlt;

var pauseMessage = "pause";
var buttonSetup;
var reminderTag;
var reminderEntrybox;
var firstCall;
var intervalID;

var displayMode  = 'normal'; // oder 'edit'
var editID       = -1;
var changes      = false;
var settings     = {};
settings.showRole     = [true, true, true, true];  // 0 .. zeige die Rolle nicht an, 1 .. zeige sie an.

let myTabId;
getMyTabId();




function getMyTabId() {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
        myTabId = tabs[0].id;
    });    
}



// 1. Installiere Event-Listeners für Messages
chrome.runtime.onMessage.addListener(function (request, sender, respond) {
    // diese Funktion hört auf Messages, die im Chrome verteilt werden.
console.log("SST: >>[", request.type, "] von", sender.tab ?
        "dem Content script:" + sender.tab.url :
        "der Extension");
    switch (request.type) {
            
            case "are-you-avoided?":
console.log("SST: Ich werde gefragt, ob ich avoided bin:", avoidDomain);
                respond({url: url,  // hier war avoidDomain. Warum? Geändert um die richtige URL an popup.js weiterzugeben.
                         url: url,
                         avoided: true, 
                         avoidDomain: avoidDomain,
                         subDomains: subDomains,
                         avoidLevels: avoidLevels, 
                         reminder: reminder
                        });

console.log("SST: Na sage ich:", url, avoidDomain, reminder, avoidLevels);
                break;
            
            case "setRole":
                activeRole = request.role;
console.log("SST: Rolle wurde geändert auf", activeRole);
                clearButtons();
                setRoleButton();
                break;
                
            case "setAvoidLevels":
                avoidLevels = request.avoidLevels;
                setAllAvoidLevelButtons();
                respond();
                break;     
            
        default:
            console.log("SST: Kenne ich nicht.");
    }
});





document.addEventListener("DOMContentLoaded", function(){
    // Wird aufgerufen sobald das Dokument geladen ist.
    // Nachfragen, wer überthaupt avoided werden soll.
console.log("SST: ask whom-do-I-avoid?");
    
    chrome.runtime.sendMessage({
        type: "whom-do-I-avoid?",
    }, function (ans) {
        url          = ans.AO.url;
        avoidDomain  = ans.AO.domain;
        subDomains   = ans.AO.subDomains;
        reminder     = ans.AO.reminder;
        avoidLevels  = ans.AO.avoidLevels;
        alternatives = ans.AO.alternatives;
        displayMode  = ans.mode;
        activeRole   = ans.role;
        settings     = ans.settings;
        if (settings.textOpacity == undefined) {settings.textOpacity = 0.7};
        gotLevels    = true;
console.log("SST: Got answer whom-do-I-avoid:", ans.AO, displayMode, avoidLevels);
        if (avoidLevels != undefined) showAvoidLevels = true;
        if (reminder == 'new') {
            displayMode = 'edit';
            firstCall = true;
            initConfirmButtons();
        }
        setAllAvoidLevelButtons();  // from toolbar.js
        setDisplayMode(displayMode);
        setSettings();
        fillInReminder();
        document.getElementById('sign').style.setProperty('--text-opacity', settings.textOpacity);
        document.getElementById('buttonSetup').addEventListener('click', function () { changeToSetup(); });
    });

    
//    $("header").load("header.html");
    $("#toolbar").load("toolbar.html", function() {
        toolbarLoaded = true;
        toolbar.avoidLevles = avoidLevels;
        toolbar.activeRole = activeRole;
        pageLoaded = true;
        document.getElementById('buttonPause').style.display = 'none';
        initButtons();
        buttonSetup = document.getElementById('buttonSetup');
    });
    
    reminderTag      = document.getElementById("reminder");
    reminderEntrybox = document.getElementById('reminderEntrybox');
    



console.log("SST: --- ShowStopper Seite geladen ---");

    localizeHtmlPage();
console.log("SST: --- und übersetzt");

    if (paused !== undefined) { actualizePause(paused) };
    
    installSetupEventPauseTime();
    installSetupJustRiseAvoidLevelsCheckbox();
    installSetupNoChangeToAvoidLevel0Checkbox();
    installSetupDoNotEnterCheckbox();
    installSetupShowRoleCheckbox(0);
    installSetupShowRoleCheckbox(1);
    installSetupShowRoleCheckbox(2);
    installSetupShowRoleCheckbox(3);
    
});


function installSetupEventPauseTime() {
    let slider = document.getElementById("pauseTime");
    slider.oninput = function() {
        let pauseTime = this.value*5;
        document.getElementById('pauseMinutes').innerHTML = pauseTime;
        slider.onchange = function() {
            settings.pauseTime = pauseTime;
            chrome.extension.sendMessage({
                type: 'saveSettings',
                settings: settings
            });
        }
    }
}

function installSetupJustRiseAvoidLevelsCheckbox() {
    let justRiseAvoidLevel = document.getElementById("justRiseAvoidLevels");
    justRiseAvoidLevel.oninput = function() {
        settings.justRiseAvoidLevels = false;
        if (this.checked) { settings.justRiseAvoidLevels = true; } 
            
        chrome.extension.sendMessage({
            type: 'saveSettings',
            settings: settings
        });
    }
}

function installSetupNoChangeToAvoidLevel0Checkbox() {
    let checkbox = document.getElementById("noChangeToAvoidLevel0");
    checkbox.oninput = function() {
        settings.noChangeToAvoidLevel0 = false;
        if (this.checked) { settings.noChangeToAvoidLevel0 = true; } 
            
        chrome.extension.sendMessage({
            type: 'saveSettings',
            settings: settings
        });
    }
}

function installSetupDoNotEnterCheckbox() {
    let showDoNotEnter = document.getElementById("showDoNotEnter");
    showDoNotEnter.oninput = function() {
        settings.textOpacity = 0;
        if (this.checked) { settings.textOpacity = 0.7; } 
            
        chrome.extension.sendMessage({
            type: 'saveSettings',
            settings: settings
        });
        document.getElementById('sign').style.setProperty('--text-opacity', settings.textOpacity);
    }
}

function installSetupShowRoleCheckbox(r) {
    let showRoleElemet = document.getElementById("showRole"+r);
    showRoleElemet.oninput = function() {
        settings.showRole[r] = false;
console.log("SST: showRoles:", settings.showRole);
        if (this.checked) { settings.showRole[r] = true; } 
            
        chrome.extension.sendMessage({
            type: 'saveSettings',
            settings: settings
        });
        showRoles(settings.showRole);
    }
}



function setSettings() {
    document.getElementById('pauseMinutes').innerHTML = settings.pauseTime;
    document.getElementById('pauseTime').value=settings.pauseTime/5;
    setCheckbox('showDoNotEnter', settings.textOpacity);
    setCheckbox('showRole0', settings.showRole[0]);
    setCheckbox('showRole1', settings.showRole[1]);
    setCheckbox('showRole2', settings.showRole[2]);
    setCheckbox('showRole3', settings.showRole[3]);
}


function setCheckbox(element, value) {
    if (value) {
        document.getElementById(element).checked=true;
    } else {
        document.getElementById(element).checked=false;
    }
}



function changeToSetup(){
// die Funktion, die aufgerufen wird, wenn der Setupbutton geklicked wird.
console.log("SST: Setup clicked");
    if (displayMode == 'normal') {  // das ist der Anzeigemodus
        tp = 0;
        unpeer();
        setTimeout( function() { setDisplayMode('edit'); }, 500);
    } else { // das ist der Edit-Modus
//        if (!changes) {
//            setDisplayMode('normal');
//        } else {
//            if (confirm('Do you want to save your changes?')) {setupChangesConfirmed();}
            setDisplayMode('normal');
console.log('SST: Back to Normal');
//        }
    }
}


function setDisplayMode(mode){ 
// verändert die Darstellung von 'normal' auf 'edit'
    if (pageLoaded) {
console.log("SST: setDisplayMode", mode, reminder);
        displayMode = mode;
        let signarea = document.getElementById("toucharea");
        if (reminder == 'new') {
            document.getElementById('confirmButtons').style.display = 'block';
            document.getElementById('buttonSetup').style.display = 'none';
        }
        showAlternatives();
        
        // Bereich alternative Webseiten
        // zur Eingabe von alternativen Webseiten
        let inputAlternatives = document.getElementById("inputAlternatives");
        inputAlternatives.addEventListener('change', addAlternative);
        
        // Allgemein
        if (displayMode == 'edit') {  // das ist der Editmodus
            document.getElementById('buttonPassby').style.display = 'none';
            document.getElementById('buttonPause2').style.display = 'none';
            buttonSetup.className += " active";
            signarea.style.display    = 'none';
            document.getElementById('generalSettings').style.display = 'block';
            document.getElementById('subdomainSection').style.display = 'block';

            stopFaceMimics();
            setTimeout(function() {
                reminderTag.style.display = "none";
                reminderEntrybox.style.display = 'block';
            }, 700);
        } else { // das ist der Blockiermodus
            buttonSetup.className = buttonSetup.className.replace(" active", "");
            reminderTag.style.display      = "block";
            signarea.style.display         = 'block';
            reminderEntrybox.style.display = 'none';
            document.getElementById('generalSettings').style.display = 'none';
            document.getElementById('localSettings').style.display = 'none';
            document.getElementById('syncedSettings').style.display = 'none';
            document.getElementById('subdomainSection').style.display = 'none';
            document.getElementById('buttonLocalSettings').style.display = 'block';
            document.getElementById('buttonSyncedSettings').style.display = 'block';
            document.getElementById('buttonLocalSettings').addEventListener('click', openLocalSettings);
            activateFaceMimics();
            actualizeSmallButtons();
        }

        showDomainInfo(displayMode);

    } else {
        setTimeout(setDisplayMode, 28);
    }
};


function openLocalSettings() {
    document.getElementById('localSettings').style.display = 'block';
    document.getElementById('buttonLocalSettings').style.display = 'none';
    document.getElementById('buttonSyncedSettings').addEventListener('click', openSyncedSettings);    
}


function openSyncedSettings() {
    document.getElementById('syncedSettings').style.display = 'block';
    document.getElementById('buttonSyncedSettings').style.display = 'none';
}


function addAlternative(object) {
// fügt eine weitere alternative Website hinzu.
    document.getElementById('alternativeNoUrl').style.display = 'none';
    let inputAlternatives = object.target;
    let newAlternativeUrl = inputAlternatives.value;
    newAlt = newAlternative(newAlternativeUrl);
    if (!isValidURL(newAlternativeUrl)) {
        document.getElementById('alternativeNoUrl').style.display = 'block';
    } else {
        for (var a=0; a<alternatives.length; a++) {
            if (alternatives[a].url == newAlt.url) {
                inputAlternatives.value = "sorry this alternative is already here."
                return;
            }
        }
        alternatives.push(newAlt);
        inputAlternatives.value = 'https://';
        editID = alternatives.length - 1;
        showAlternatives();
        saveChanges();
        activateClaimEntry();
    }
}


function activateClaimEntry() {
    document.getElementById('alternativesUrl').style.display = 'none';
    document.getElementById('alternativesClaimArea').style.display = 'block';
    document.getElementById('buttonAlternativesOK').addEventListener('click', newAlternativeOK);
}


function newAlternativeOK() {
    document.getElementById('alternativesUrl').style.display = 'block';
    document.getElementById('alternativesClaimArea').style.display = 'none';
    editID = -1;
    showAlternatives();
}


function showAlternatives() {
// Die Alternativen Websites sollen angezeigt werden.
    let alternativesArea = document.getElementById('alternativesArea');
    let fillString = '';
    for (var a = 0; a < alternatives.length; a++) {
console.log('SST: Alternatives:', alternatives[a]);
        let [domain, sub] = splitUrl(alternatives[a].url);
        
        if ((displayMode == "edit") || (editID == a)) {
            fillString += "<div class='alternative' id='alternative" + a + "' ";
            fillString += "style='background-color:";
            fillString += alternatives[a].color;
            fillString += "'>";
            fillString += iconFrom(domain) + " ";
            fillString += alternatives[a].name;
            fillString += "<div class='alternativeClaimEdit'>";
            fillString += "<input id='inputAlternativeClaim" + a + "' class='alternativeClaimInput'>";
//            fillString += "<span id='inputAlternativeClaim" + a + "'>" + alternatives[a].claim + "</span>";
            fillString += "</div>";
            fillString += "<div class='colorPicker' id='buttonAlternativeColor" + a +"'></div>";
            fillString += "<input type='color' id='inputAlternativeColor" + a + "' style='display: none'>";
            fillString += "<button id='removeAlternative" + a + "' class='buttonSmallRemove alternativeRemove'>X</button>";
            fillString += "</div>";        
        }
        else {
            fillString += "<a href='" + alternatives[a].url + "'>";
            fillString += "<div class='alternative'";
            fillString += "style='background-color:";
            fillString += alternatives[a].color;
            fillString += "'>";
            fillString += iconFrom(domain) + " ";
            fillString += alternatives[a].name;
            fillString += "<div class='alternativeClaim'>";
            fillString += alternatives[a].claim;
            fillString += "</div>";
            fillString += "</div>";
            fillString += "</a>";        
        }
    }
    alternativesArea.innerHTML = fillString;
    for (var a = 0; a < alternatives.length; a++) {
        if ((displayMode == "edit") || (editID == a)) {
            document.getElementById("removeAlternative"+a).addEventListener('click', removeAlternative);
            document.getElementById("inputAlternativeClaim"+a).addEventListener('change', editAlternativeClaim);
            document.getElementById("inputAlternativeClaim"+a).value = alternatives[a].claim;
            document.getElementById("buttonAlternativeColor"+a).addEventListener('click', editAlternativeColor);
        }
    }
}

function removeAlternative(object) {
    let element = object.target;    
    let id = parseInt(element.id.replace('removeAlternative',''));
console.log("SST: REMOVE clicked", element, id);
    alternatives.splice(id, 1);
    document.getElementById('alternativesUrl').style.display = 'block';
    document.getElementById('alternativesClaimArea').style.display = 'none';
    editID = -1;
    showAlternatives();
    saveChanges();
}


function editAlternativeClaim(object) {
    let element = object.target;
    let id = parseInt(element.id.replace('inputAlternativeClaim',''));
    alternatives[id].claim = element.value;
console.log("SST: editClaim", id, alternatives[id].claim);
//    showAlternatives();
    saveChanges();
}


function editAlternativeColor(object) {
    let element = object.target;
    let id = parseInt(element.id.replace('buttonAlternativeColor',''));
    let colorPicker = 'inputAlternativeColor' + id;
console.log("SST: editColor clicked", id, colorPicker);
    colorPicker = document.getElementById(colorPicker);
    colorPicker.value = alternatives[id].color;
    colorPicker.click();
    colorPicker.addEventListener('input', changeAltColor);
    colorPicker.addEventListener('change', setAltColor);
}


function changeAltColor(object) {
    let element = object.target;
    let inputColor = element.value;
    let id = element.id.replace("inputAlternativeColor", "");
console.log("SST: changeColor Object", id, inputColor);
    document.getElementById('alternative' + id).style.backgroundColor = inputColor;
    alternatives[id].color = inputColor;
}


function setAltColor(object) {
    let element = object.target;
    let inputColor = element.value;
    let id = element.id.replace("inputAlternativeColor", "");
console.log("SST: Color changed", id, inputColor);
    alternatives[id].color = inputColor;
    saveChanges();    
    showAlternatives();
}


function iconFrom(domain) {
    let link = "<img src='https://icons.duckduckgo.com/ip2/www." + domain + ".ico' class='icon'>";
console.log("SST: Get Favicon from: ", link);    
    return link;
}


function isValidURL(urlString) {
    let [domain, sub] = splitUrl(urlString);
    if (domain == chrome.runtime.id) {
        return false;
    }
    return true;
}


function setupChangesConfirmed() {
// Wird aufgerufen wenn der Edit-Modus mit confirm verlassen wird
// Derzeit nicht aktiv. Änderungen werden immer sofort gespeichert.
console.log("SST: confirm clicked");
    saveChanges();
};


function saveChanges() {
    // Wird aufgerufen wenn der Confirm-Button gedrückt wird. 
    let AO = {};
    AO.domain       = avoidDomain;
    AO.subDomains   = subDomains;
    AO.reminder     = reminderEntrybox.value;
    AO.avoidLevels  = avoidLevels;
    AO.alternatives = alternatives;
    chrome.extension.sendMessage({
        type: 'actualize-AO',
        tabId: myTabId,
        avoid: AO
    });
};


function fillInReminder() {
    // Setzt Demotexte in di reminder-Editbox ein
    // Holt sie sich zuvor aus einem nicht angezeigten Bereich des Dokumentes. So funktioniert die Übersetzung ohne weitere Kopfstände.
    if (pageLoaded && reminderTag) {
        if (reminder == 'new') {
            reminder = ''; // Damit er bei mehrmaligem Wechsel von Edit-Normal
            // nicht jedes Mal einen neuen Timer anlegt.
            // Zur Darstellung von einigen Beispielsätzen in der Reminder-Box.
console.log("SST: Beispielsätze");

            var examplePhrase;
            examplePhrase = document.getElementById('examplePhrases').innerHTML;
            examplePhrase = examplePhrase.split('/');
            
            var i = 0;
            intervalID = window.setInterval(function () {
                if (i < 5) {
                    i++;
                } else {
                    i = 0;
                }
                reminderEntrybox.value = examplePhrase[i];
                fitEntrybox();
            }, 3000);  
            
        } else {
            reminderTag.innerHTML = reminder; 
            fitReminder();
            reminderEntrybox.value = reminder;        
            fitEntrybox();
            setAllAvoidLevelButtons();
        }

        // Sobald man in die Reminder-Box clickt soll diese gelöscht werden.
        reminderEntrybox.addEventListener("click", function () {
            if (firstCall) {
                window.clearInterval(intervalID);
                if (reminder == 'new' || !reminder) {
                    reminderEntrybox.value = "";
                } 
            } 
        });

        reminderEntrybox.addEventListener("input", function () {
console.log("SST: Textarea changed");  
            fitEntrybox();
            firstCall = false;
            changes = true;
        });
                
    } else {
        setTimeout(fillInReminder, 33);
    }
}

function fitEntrybox() {
// Fits Entrybox to size of text.
    let text = reminderEntrybox.value;
    if (text.length < 47) {
        reminderEntrybox.className = 'lines2';
        reminderEntrybox.rows = 2;
        reminderEntrybox.cols = 18;
    } else {
        reminderEntrybox.className = 'lines3';
        reminderEntrybox.rows = 3;
        reminderEntrybox.cols = 27;
    }
}

function fitReminder() {
// Fits Entrybox to size of text.
    let reminder = document.getElementById("reminder");
    let text = reminder.innerHTML;
    if (text.length < 47) {
        reminder.className = 'lines2';
    } else {
        reminder.className = 'lines3';
    }
}

function initConfirmButtons() {
// initialisiert die Confirm- und Cancel-Buttons am Ende der Seite    
    document.getElementById("buttonConfirm").addEventListener("click", function () {
        // Eventlistener für den Confirm-Button.
        saveChanges();
        closeTab();
    });

    document.getElementById("buttonCancel").addEventListener("click", function () {
        // Eventlistener für den Cancle-Button
        chrome.extension.sendMessage({
            type: "pass-by!",
            tabId: myTabId,
            url: url
        });
    });
} 

function closeTab() {
    chrome.tabs.remove(myTabId);
}


function actualizeSmallButtons() {
    if(pageLoaded) {
        let disp = 'block';
        if (avoidLevels[activeRole] == 3) disp = 'none';
        document.getElementById('buttonUnavoid').style.display = disp;
        document.getElementById('buttonPassby').style.display  = disp;
        document.getElementById('buttonPause2').style.display  = disp;    
    }
}
