"use strict";
var toolbarLoaded = false;
var avoidLevels = undefined;
var gotLevels = false;
var showAvoidLevels = false;
var activeRole = undefined;
var paused = undefined;

initButtons();

function initButtons() {
    
    // 1. fragt die aktuelle Rolle von bck ab.
console.log("ToB: Ask: getRole");
    chrome.runtime.sendMessage(
        { type: "getRole" 
        },
        function(reply) {
            activeRole = reply.role;
console.log("ToB: CB Got: Role", activeRole);
            setRoleButton(activeRole);
        }
    );


    // 2. fragt ab ob gerade Pause ist bei bck.
console.log("ToB: Ask: paused");
    chrome.runtime.sendMessage(
        { type: "paused?" 
        },
        function(reply) {
            paused    = reply.paused;
console.log("ToB: Got: Pause", paused);
            actualizePause(paused);
        }
    );

    
    initButtonListeners();

    function initButtonListeners() {
console.log("ToB: Initializing Buttons", toolbarLoaded);
        if (toolbarLoaded) {
            // Setup and Pause Button
            $('#buttonSetup').on('click', function () { changeToSetup(); });
            $('#buttonPause').on('click', function () { pauseClicked(); });

            // Roles
            $('#buttonR0').on('click', function () { setRole(0, "buttonR0"); });
            $('#buttonR1').on('click', function () { setRole(1, "buttonR1"); });
            $('#buttonR2').on('click', function () { setRole(2, "buttonR2"); });
            $('#buttonR3').on('click', function () { setRole(3, "buttonR3"); });

           // avoidLevels
            $('#buttonL0').on('click', function () { setAvoidLevel(0); });
            $('#buttonL1').on('click', function () { setAvoidLevel(1); });
            $('#buttonL2').on('click', function () { setAvoidLevel(2); });
            $('#buttonL3').on('click', function () { setAvoidLevel(3); });

           // Pause
            $('#buttonP6').on('click', function () { setPause(480); });
            $('#buttonP5').on('click', function () { setPause(240); });
            $('#buttonP4').on('click', function () { setPause(120); });
            $('#buttonP3').on('click', function () { setPause(60); });
            $('#buttonP2').on('click', function () { setPause(30); });
            $('#buttonP1').on('click', function () { setPause(10); });
            $('#buttonP0').on('click', function () { setPause(5); });

    //        setRoleButton(activeRole);
    //        actualizePause(paused);

console.log("ToB: Buttons initialized.");
        } else {
console.log("ToB: Waiting for toolbarLoaded");
            setTimeout(initButtonListeners, 28);
        }
    }
};


function goToSetup() {
    chrome.extension.sendMessage({
        type: 'setup'
    });
    window.close();
};


// Functions for Role..............
function setRole(r, button) {
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
console.log("ToB: Versuche Rolle Button zu aktualisieren:", toolbarLoaded, activeRole);
    if (activeRole < 100 && toolbarLoaded) {
        var button = "buttonR"+String(activeRole);
        if (document.getElementById(button)) {
            document.getElementById(button).className += " active";
console.log("ToB: Rolle Button akktualisiert:", toolbarLoaded,activeRole);
        }
    } else {
console.log("ToB: Rolle Button retry:", toolbarLoaded,activeRole);
        setTimeout(setRoleButton, 56);
    }
}


// Functions for Pause....................
function actualizePause() {
    // Aktualisiert die Darstellung wenn Pause ist.
    if ((paused != "undefined") && toolbarLoaded) {
        if (paused) {
            // Falls die extension pausiert ist.
            document.getElementById("pauseinfo").style.display = "block";
            document.getElementById("infoline" ).style.display = "none";
console.log("ToB: Darstellung: Paused");
        } else {
            document.getElementById("pauseinfo").style.display = "none";
//            document.getElementById("infoline" ).style.display = "block";
// obige Zeile ist hier ausgeschaltet, weil sie in manchen Fällen das
// Verbergen der infoline overruled.
// Mal sehen ob das genügt.
console.log("ToB: Darstellung: Not Paused");
        }
    } else {
        setTimeout(actualizePause, 27);
    }
}

function pauseClicked() {
console.log("ToB: Pause clicked");
    if (!paused) {
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
    if ( avoidLevels[l] > 3 ) avoidLevels[l] = 0; 
    setAvoidLevelButton(l, avoidLevels[l]);
    chrome.extension.sendMessage({
        type: 'setAvoidLevels',
        avoidDomain: avoidDomain,
        avoidLevels: avoidLevels
    });
}

function setAllAvoidLevelButtons() {
    if (showAvoidLevels) {
console.log("ToB: Trying to set avoidLevel-Buttons.", toolbarLoaded, avoidLevels);
        if (toolbarLoaded && gotLevels) {
            // Setzt alle RoleLevelButtons mit dem richtigen Icon
            for (var b = 0; b < 4; b++) {
                setAvoidLevelButton(b, avoidLevels[b]);
            }
        } else {
console.log("ToB: Not yet ready", toolbarLoaded, avoidLevels);
            setTimeout(setAllAvoidLevelButtons, 35);
        }
    } else {
console.log("ToB: No avoidLevels to show.");  
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

