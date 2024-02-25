// Das ist die Webseite, die gezeigt wird, wenn eine Seite vermieden werden soll.
"use strict";
const me = "stp";
var myTab;
var pageLoaded = false;
var toolbarLoaded = false;
var siteIsAvoided;
var paused;
var url;
var avoidDomain;
var subDomains;        // das sind Subdomains, die bereits avoided werden.
var reminder = "";
var avoidLevels = [];
var activeRole = 100;
var alternatives = [];

var pauseMessage = "pause";
var buttonSetup;
var reminderTag;
var reminderEntrybox;
var firstCall;
var intervalID;

var displayMode = 'normal'; // oder 'edit'
var changes = false;

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
console.log("Sst: >>[", request.type, "] von", sender.tab ?
        "dem Content script:" + sender.tab.url :
        "der Extension");
    switch (request.type) {
            
            case "are-you-avoided?":
console.log("Sst: Ich werde gefragt, ob ich avoided bin:", avoidDomain);
                respond({url: avoidDomain,
                         avoided: true, 
                         avoidDomain: avoidDomain,
                         avoidLevels: avoidLevels, 
                         reminder: reminder
                        });

console.log("Sst: Na sage ich:", avoidDomain, reminder, avoidLevels);
                break;
            
            case "setRole":
                activeRole = request.role;
console.log("Sst: Rolle wurde geändert auf", activeRole);
                clearButtons();
                setRoleButton();
                break;
                
            case "setAvoidLevels":
                avoidLevels = request.avoidLevels;
                setAllAvoidLevelButtons();
                respond();
                break;     
            
        default:
            console.log("Sst: Kenne ich nicht.");
    }
});







// $(document).ready(function () { // jquery-Ausbau
document.addEventListener("DOMContentLoaded", function(){
    // Wird aufgerufen sobald das Dokument geladen ist.
    // Nachfragen, wer übrthaupt avoided werden soll.
console.log("Sst: ask whom-do-I-avoid?");
    chrome.runtime.sendMessage({
        type: "whom-do-I-avoid?",
    }, function (ans) {
        url         = ans.url;
        displayMode = ans.mode,
        avoidDomain = ans.avoidDomain;
        subDomains  = ans.subDomains;
        reminder    = ans.reminder;
        avoidLevels = ans.avoidLevels;
        activeRole  = ans.role;
        gotLevels = true;
console.log("Sst: Got answer whom-do-I-avoid:", avoidDomain, reminder, displayMode, avoidLevels, "N:", subDomains);
        if (avoidLevels != undefined) showAvoidLevels = true;
        if (reminder == 'new') {
            displayMode = 'edit';
            firstCall = true;
            initConfirmButtons();
        }
        setAllAvoidLevelButtons();  // from toolbar.js
        setDisplayMode(displayMode);
        fillInReminder();

    });


    
//    $("header").load("header.html");
    $("#toolbar").load("toolbar.html", function() {
        toolbarLoaded = true;
        toolbar.avoidLevles = avoidLevels;
        toolbar.activeRole = activeRole;
        pageLoaded = true;
        document.getElementById('buttonPause').style.display = 'none';
        buttonSetup = document.getElementById('buttonSetup');
    });
    
    reminderTag      = document.getElementById("reminder");
    reminderEntrybox = document.getElementById('reminderEntrybox');
    



console.log("Sst: --- ShowStopper Seite geladen ---");

    localizeHtmlPage();
console.log("Sst: --- und übersetzt");

    if (paused !== undefined) { actualizePause(paused) };


    $('#buttonAlternatives').on('click', function () {
        chrome.extension.sendMessage({
            type: "show-alternatives"
        }, function () {});
    });
});


function changeToSetup(){
// die Funktion, die aufgerufen wird, wenn der Setupbutton geklicked wird.
console.log("Setup clicked");
    if (displayMode == 'normal') {  // das ist der Anzeigemodus
        setDisplayMode('edit');
    } else { // das ist der Edit-Modus
        if (!changes) {
            setDisplayMode('normal');
        } else {
            $.confirm({
                title: 'Do you want to save your changes?',
                content: '?',
                icon: 'fa fa-warning',
                buttons: {
                     ok: function() { setupChangesConfirmed(); },
                     cancel: function () {setDisplayMode('normal')}
                }
            });
        }
    }
}


function setDisplayMode(mode){ 
// verändert die Darstellung von 'normal' auf 'edit'
    if (pageLoaded) {
console.log("Sst: setDisplayMode", mode, reminder);
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
            activateFaceMimics();
            actualizeSmallButtons();
        }

        
        // Infobereich
console.log("Sst: url", url);
            // Hier werden jetzt allfälligen Subdomains angezeigt.
            
/* 
Varianten: 
1. Du möchtest die Webseite "derstandard.at" nicht mehr verwenden.
2. Von der Webseite 'derstandard.at' möchtest du den Bereich 'stories' nicht mehr verwenden.
3. Von der Webseite 'derstandard.at' möchtest du die Bereiche 'stories'(x), 'service'(x) nicht mehr verwenden. 
-- Edit:
Du kannst aber auch nur den Bereich 'stories' von dieser Website blockieren.
Du kannst aber auch nur einen der Bereiche 'stories', 'service' von dieser Website blockieren?
Du kannst aber auch zusätzlich den Bereich 'service' von dieser Website blockieren?
Du kannst aber auch zusätzlich einen der Bereiche 'stories', 'service' von dieser Website blockieren.
Durch Löschen aller Bereiche blockierst du die gesamte Website.

1. You do not want to use the website 'derstandard.at' anymore.
2. From the website 'derstandard.at' you do not want to use the service 'stories'(x) anymore.
3. From the website 'derstandard.at' you do not want to use the services 'a'(x), 'b'(x) anymore.
-- Edit:
But you can also block just the service 'stories' from this website.
But you can also block just one of the services 'a', 'b' from this website.
But you can also additionally block the service 'b' from this website.
But you can also additionally block one of the services 'b', 'c' from this website.

*/
            
           
        if (url) {
            let mainDomain, newSubs, search;
            let infoline = document.getElementById("infoline");
            [mainDomain, newSubs, search] = getDomain(url);
            avoidDomain = mainDomain;
console.log('SSSSS S:', subDomains, "U:", newSubs);
            if (!subDomains || subDomains.length == 0) { // keine Subdomains
                document.getElementById("domainSolo").innerHTML = mainDomain;
                document.getElementById("infoDom").style.display = "block";
            } else { // Subdomains
                if (subDomains.length < 2) {
                    document.getElementById("domainSub").innerHTML = mainDomain;
                    let sub = subDomains[0];
                    document.getElementById("avoidedSub").innerHTML = sub;
                    document.getElementById("infoSub").style.display = "block";
                    newSubs = newSubs.remove(sobDomains[0]);
                } else {
                    document.getElementById("domainSubs").innerHTML = mainDomain;
                    let sub = subDomains;
                    document.getElementById("avoidedSubs").innerHTML = sub;
                    document.getElementById("infoSubs").style.display = "block";
                    newSubs = newSubs.filter(item => !subDomains.includes(item));
                }
            }
            infoline.style.display = "block";
console.log('RRRRR', newSubs);
                
            if (displayMode == 'edit') {  // das ist der Editmodus)
                
                if (newSubs && newSubs.length > 0) {
                    let subdomainSection = document.getElementById('subdomainSection');
                    subdomainSection.style.display = 'block';
                    let buttonsNew = '';
                    for (var sub=0; sub < newSubs.length; sub++) {
                        let button = '<button id="buttonSub'+sub+'">'+newSubs[sub]+'</button>';
                        buttonsNew += button;
                    }
                    document.getElementById('buttonSubdom').innerHTML = buttonsNew;
                    let avoidSubs = [];
                    for (var sub=0; sub < newSubs.length; sub++) { // add EventListeners
                        let buttonId  = 'buttonSub'+sub;
                        let button    = document.getElementById(buttonId);
                        let buttonSub = button.innerHTML;
                        button.addEventListener('click', function() {
console.log('Sst:', buttonId, 'clicked');
                            avoidSubs.push(buttonSub);
//                            subdomainSection.style.display = 'none';
console.log('Sst: avoided Subs', avoidSubs);
                            subDomains = subDomains.concat(avoidSubs);
                        });
                    }
                }
            }
        }

    } else {
        setTimeout(setDisplayMode, 28);
    }
};


function addAlternative(object) {
// fügt eine weitere alternative Website hinzu.
    let inputAlternatives = object.target;
    let newAlternative = inputAlternatives.value;
    let [domain, sub, s] = getDomain(newAlternative);
    if (domain == chrome.runtime.id) {
        inputAlternatives.innerHTML = "sorry this is no valid URL";
console.log('BBBBB Keine URL');        
    } else {
console.log('AAAAA', domain);
        alternatives.push(newAlternative);
        inputAlternatives.value = '';
        showAlternatives();
    }
    if (newAlternative) {
    }
}
var myExtensionId = chrome.runtime.id;


function showAlternatives() {
// Die Alternativen Websites sollen angezeigt werden.
    let alternativesArea = document.getElementById('alternativesArea');
    let fillString = '';
    for (var a = 0; a < alternatives.length; a++) {
        let [domain, sub, s] = getDomain(alternatives[a]);
        fillString += "<a href='" + alternatives[a] + "' class='alternative'>" + domain + "</a>";
        fillString += "<button id='buttonAlt" + a + "'>x</button><br>";
    }
    alternativesArea.innerHTML = fillString;
    for (var a = 0; a < alternatives.length; a++) {
        document.getElementById("buttonAlt"+a).addEventListener('click', removeAlternative);
    }
    sendChanges();
}

function removeAlternative(object) {
    let button = object.target;
    let element = parseInt(button.id.replace('buttonAlt',''));
console.log("REMOVE clicked", button, element+2);
    alternatives.splice(element, 1);
    showAlternatives();
}

function foo() {
    console.log('FOOO');
}

function setupChangesConfirmed() {
// Wird aufgerufen wenn der Edit-Modus mit confirm verlassen wird
console.log("confirm clicked");
    signtag = document.getElementById('sign');
    signtag.style.animation = 'ausblendung 1s';
    sendChanges();
//    window.close(); // für Entwicklung
};
    
function sendChanges() {
    // Wird aufgerufen wenn der Confirm-Button gedrückt wird. 
    let AO = {};
    AO.domain       = avoidDomain;
    AO.subDomains   = subDomains;
    AO.reminder     = reminderEntrybox.value;
    AO.avoidLevels  = avoidLevels;
    AO.alternatives = alternatives;
    chrome.extension.sendMessage({
        type: 'avoid-site-confirm',
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
console.log("Sst: Beispielsätze");

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
console.log("Textarea clicked");            
            if (firstCall) {
                window.clearInterval(intervalID);
                if (reminder == 'new' || !reminder) {
                    reminderEntrybox.value = "";
                } 
            } 
        });

        reminderEntrybox.addEventListener("input", function () {
console.log("Textarea changed");  
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
        reminderEntrybox.cols = 22;
    } else {
        reminderEntrybox.className = 'lines3';
        reminderEntrybox.rows = 3;
        reminderEntrybox.cols = 33;
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
        sendChanges();
        window.close();
    });

    document.getElementById("buttonCancel").addEventListener("click", function () {
        // Eventlistener für den Cancle-Button
        window.close();
    });
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
