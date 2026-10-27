
"use strict";
var toolbarLoaded = false;
var avoidLevels = undefined;
var gotLevels = false;
var showAvoidLevels = false;
var activeRole = undefined;
var paused = undefined;
var settings;


function initButtons() {
    
    // 1. fragt die aktuelle Rolle von bck ab.
//console.log("ToB: Ask: getRole");
    chrome.runtime.sendMessage(
        { type: "getRole" 
        },
        function(reply) {
            activeRole = reply.role;
//console.log("ToB: CB Got: Role", activeRole);
            setRoleButton(activeRole);
        }
    );


    // 2. fragt ab ob gerade Pause ist bei bck.
//console.log("ToB: Ask: paused");
    chrome.runtime.sendMessage(
        { type: "paused?" 
        },
        function(reply) {
            paused    = reply.paused;
//console.log("ToB: Got: Pause", paused);
            actualizePause(paused);
        }
    );

    
    // 3. fragt die Settings bei bck ab.
//console.log("ToB: Ask: paused");
    chrome.runtime.sendMessage(
        { type: "getSettings" 
        },
        function(reply) {
            settings    = reply.settings;
console.log("ToB: Got: Settings", settings);
            var showRole  = settings.showRole;
            initButtonListeners();
            showRoles(showRole);
        }
    );

    

    function initButtonListeners() {
//console.log("ToB: Initializing Buttons", toolbarLoaded);
        if (toolbarLoaded) {
            // Setup and Pause Button
            document.getElementById('buttonPause').addEventListener('click', function () { pauseClicked(); });

            // Roles und avoidLevels
            // Warum das nicht in einer Schleife geht?
            // Wenn man das in einer for-Schleife macht und die Konstanten durch eine 
            // Variable r ersetzt, r = 0 .. 3, dann ist beim Aufruf von z.B. setRole(r)
            // r immer 4. Komisch, aber deshalb nicht in einer Schleife.

            document.getElementById("buttonR0").addEventListener('click', function () { setRole(0); });
            document.getElementById("buttonR1").addEventListener('click', function () { setRole(1); });
            document.getElementById("buttonR2").addEventListener('click', function () { setRole(2); });
            document.getElementById("buttonR3").addEventListener('click', function () { setRole(3); });
            document.getElementById("buttonL0").addEventListener('click', function () { setAvoidLevel(0); });
            document.getElementById("buttonL1").addEventListener('click', function () { setAvoidLevel(1); });
            document.getElementById("buttonL2").addEventListener('click', function () { setAvoidLevel(2); });
            document.getElementById("buttonL3").addEventListener('click', function () { setAvoidLevel(3); });

console.log("ToB: Buttons initialized.");
        } else {
console.log("ToB: Waiting for toolbarLoaded");
            setTimeout(initButtonListeners, 28);
        }
    }
};


// Functions for Role..............
function showRoles(showRole) {
// Versteckt Buttons, die nicht angezeigt werden sollen.
console.log('ToB: showRoles:', showRole);
    var cont = document.getElementById("roles");
    var btns = cont.getElementsByClassName("buttonRole");
    for (var b = 0; b<btns.length; b++) {
        btns[b].className = btns[b].className.replace(" invisible", "");
        if (!showRole[b]) { btns[b].className += " invisible"};
    }
    
    cont = document.getElementById("avoidLevels");
    btns = cont.getElementsByClassName("buttonAvoidLevel");
    for (var b = 0; b<btns.length; b++) {
        btns[b].className = btns[b].className.replace(" invisible", "");
        if (!showRole[b]) { btns[b].className += " invisible"};
    }
}

function setRole(r) {
    if (checkNoChangeToAvoidLevel0(r)) {
        let button = "buttonR"+r;
        activeRole = r;
        chrome.extension.sendMessage({
            type: 'setRole',
            role: activeRole
        });
    console.log("ToB: setRole:", activeRole);
        clearButtons();
        document.getElementById(button).className += " active";
        actualizeSmallButtons();
    }
}

function clearButtons() {
    // zum Löschen werden die zusätzlichen Klassen "active" aus
    // class-tag gelöscht.
    var cont = document.getElementById("roles");
    var btns = cont.getElementsByClassName("buttonRole");
    for (var b = 0; b<btns.length; b++) {
        btns[b].className = btns[b].className.replace(" active", "");
    }
}

function setRoleButton() {
//console.log("ToB: Versuche Rolle Button zu aktualisieren:", toolbarLoaded, activeRole);
    if (activeRole < 100 && toolbarLoaded) {
        var button = "buttonR"+String(activeRole);
        if (document.getElementById(button)) {
            document.getElementById(button).className += " active";
console.log("ToB: Rolle Button akktualisiert:", toolbarLoaded,activeRole);
        }
    } else {
//console.log("ToB: Rolle Button retry:", toolbarLoaded,activeRole);
        setTimeout(setRoleButton, 56);
    }
}

function checkNoChangeToAvoidLevel0(role) {
    let resp=true;
    if ((displayMode == 'normal') && (settings.noChangeToAvoidLevel0) && (avoidLevels[role]==0)) { resp=false;}
    return resp;
}

// Functions for Pause....................
function actualizePause() {
    // Aktualisiert die Darstellung wenn Pause ist.
    if ((paused != "undefined") && toolbarLoaded) {
        if (paused) {
            // Falls die extension pausiert ist.
            document.getElementById("pauseinfo").style.display = "block";
            document.getElementById("infoline" ).style.display = "none";
            document.getElementById("buttonPause").className += " active";
        } else {
            document.getElementById("pauseinfo").style.display = "none";
            document.getElementById("buttonPause").className = "buttonRole";
//            document.getElementById("infoline" ).style.display = "block";
// obige Zeile ist hier ausgeschaltet, weil sie in manchen Fällen das
// Verbergen der infoline overruled.
// Mal sehen ob das genügt.
//console.log("ToB: Darstellung: Not Paused");
        }
    } else {
        setTimeout(actualizePause, 27);
    }
}

function pauseClicked() {
console.log("ToB: Pause clicked");
    if (!paused) {
        setPause(10);
    } else {
        chrome.extension.sendMessage({
            type: 'unpause'
        });
        window.close();
    }
}

function setPause(minutes) {
    chrome.extension.sendMessage({
        type: 'pause',
        minutes: minutes
    });
    window.close();
}

// Functions for avoidLevels (avoidLevels)
function setAvoidLevel(l) {
    avoidLevels[l]++;
    if (settings.justRiseAvoidLevels) {
        if (displayMode == 'edit') {
            if ( avoidLevels[l] > 3 ) avoidLevels[l] = 0; 
        } 
    } else {
        if ( avoidLevels[l] > 3 ) avoidLevels[l] = 0; 
    }
    setAvoidLevelButton(l, avoidLevels[l]);
    chrome.extension.sendMessage({
        type: 'setAvoidLevels',
        avoidDomain: avoidDomain,
        avoidLevels: avoidLevels
    });
}

function setAllAvoidLevelButtons() {
    if (showAvoidLevels) {
//console.log("ToB: Trying to set avoidLevel-Buttons.", toolbarLoaded, avoidLevels);
        if (toolbarLoaded && gotLevels) {
            // Setzt alle RoleLevelButtons mit dem richtigen Icon
            for (var b = 0; b < 4; b++) {
                setAvoidLevelButton(b, avoidLevels[b]);
            }
        } else {
//console.log("ToB: Not yet ready", toolbarLoaded, avoidLevels);
            setTimeout(setAllAvoidLevelButtons, 35);
        }
    } else {
//console.log("ToB: No avoidLevels to show.");  
        hideAvoidLevels();
    }
}

function setAvoidLevelButton(btn, level) {
    if (toolbarLoaded) {
        // Setzt das Icon für einen RoleLevel
        if (level > 3) return;
        if (btn > 3) return;
        let icon = ['./images/stack0_32.png',
                './images/stack1_32.png',
                './images/stack2_32.png',
                './images/stack3_32.png'
               ];
        var button = "buttonL" + String(btn);
        document.getElementById(button).src = icon[level];
        actualizeSmallButtons();
    }
}

function hideAvoidLevels() {
    if (toolbarLoaded) {
        document.getElementById("avoidLevels").style.display = "none";
    } else {
        setTimeout(hideAvoidLevels, 30);
    }
}

