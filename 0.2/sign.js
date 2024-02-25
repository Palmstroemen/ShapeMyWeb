// Für die Animationen im Schild
"use strict";

console.log("SIGN: sign.js started");

var reminderarea;
var signarea;
var alternativesarea;
var signtag;
var shield;
var d;
var mimicsActive = false;
var debugfield;

var x;
var y;
var pupY = -0.5;
var pupL = -0.26;
var pupR =  0.26;
var gu;
var gl;
var ggu = 0;
var ggl = 0;
var gL;
var gR;
var pY;
var pL;
var pR;
var eyeshight;
var eeyeshight = 0;
var showEyes = false;
var mouthClosed = false;
let peer = 1.0;
var smooth;

// Ändere die Mimik durch die Mausposition
function activateFaceMimics() {
console.log("SIGN: Trying to install Eventlisteners");
    if (pageLoaded) {
console.log("SIGN: Success.");        
        reminderarea = document.getElementById('reminder');
        signarea = document.getElementById("toucharea");
        signtag = document.getElementById('sign');
        shield = document.getElementById('signBackground');
        d  = parseInt(getComputedStyle(signtag).getPropertyValue('--d'));
        alternativesarea = document.getElementById('alternativesArea');
        displayMode = 'normal';
        window.addEventListener('mousemove', mimic);
        //signarea.addEventListener('mousemove', mimic);
debugfield = document.getElementById('reminder');        

        // Initialisiere die Buttons
        $('#buttonUnavoid').on('click', unavoidClicked);
        $('#buttonPause2').on('click', pauseClicked);
        $('#buttonPassby').on('click', passbyClicked);
        
        $('#buttonUnavoid').on('mouseenter', unavoidHoover);
        $('#buttonUnavoid').on('mouseleave', showReminder);
        $('#buttonPause2').on('mouseenter', pauseHoover);
        $('#buttonPause2').on('mouseleave', showReminder);
        $('#buttonPassby').on('mouseenter', passbyHoover);
        $('#buttonPassby').on('mouseleave', showReminder);

        nextUnpeer();
        
    } else {
console.log("SIGN: Retry later.");        
        setTimeout(activateFaceMimics, 34);
    }
};
     

function mimic(m) {
    // Für die Gesichtsmimik
    smooth = 0;
    if (displayMode == 'normal') {
        
    mimicsActive = true;
    if (!showEyes) {
        showEyes=true;
        var eyes = document.getElementsByClassName("eyes");
        for (var e = eyes.length-1; e > -1; e--) {
            eyes[e].className = "eyes-open";
        }
        var eyes = document.getElementsByClassName("eyes-closed");
        for (var e = eyes.length-1; e > -1; e--) {
            eyes[e].className = "eyes-open";
        }
        setTimeout(twinkle, 4000 );
        setTimeout(nextUnpeer, 0);
    }
    let box = signarea.getBoundingClientRect();
    let mX = m.pageX - box.left;
    let mY = m.pageY - box.top;
    if (mX > d) {mX = d;}
    if (mX < 0) {mX = 0;}
    if (mY < 0) {mY = 0;}
    if (mY > d) {mY = d;}
    
    x = (( mX / d) - 0.5 ) * 2;
    y = (( mY / d) - 0.5 ) * 2;       
    
    let ax = Math.abs(x*x);
    let ay = Math.abs(y*y);
    gu = 0;
    gl = 0;
    if ((avoidLevels[activeRole] == 3) || (mX == d) || (mY == d) || (mY == 0)) {
        gl = ax * ay * 2;
        eyeshight = 2;
    } else {
        if ( y > 0) {  // unterer Bereich
            gu = (y + ax * y) / 2;
            gl = (y + ax) / 3;
            eyeshight = 2;
        } else {        // oberer Bereich
            if (x > 0) {  // rechts
                gu = y * x / 4;
                gl = ax * ay * 2;
                eyeshight = 2 + ay*x;
            } else {  // links
                gu = 0 ;
                gl = ax / 2;
                eyeshight = 2 + ay*x/2;
            }
        }
        
    }
    setTimeout(smoothmove, 40);  

    // Hintergrundfarbe
    if ( y<0 && x>0 && mX<d && mY>0) {
        let xx= 0.9 - x;
        let yy = -0.9 - y;
        xx *= xx;
        yy *= yy;
        let z = (xx + yy) * 4;
        if (z > 1) { z = 1};
        let hue   = ( z - 1 )*(-140);
        let dark  = 60 + ( z - 1 ) * 30;
        let color = 'hsl(' + hue + ',100%,' + dark + '%)';
        if (avoidLevels[activeRole] != 3) {
            shield.style.setProperty('background-color', color);      
        }
    } else {
        shield.style.setProperty('background-color', 'hsl(0, 100%, 60%)');      
    }
    
    setPupillen();
    } else {
       mimicsActive = false;
    }
};


function smoothmove() {
    ggu += (gu - ggu)/20;
    ggl += (gl - ggl)/10;
    eeyeshight += (eyeshight - eeyeshight)/15;
    signtag.style.setProperty('--upper', ggu);
    signtag.style.setProperty('--lower', ggl);
    signtag.style.setProperty('--eye-size', eeyeshight);
    smooth +=1;
    if (smooth>1 && smooth<20) {
        setTimeout(smoothmove, 125);
    }
}


function setPupillen() {
    // Pupillen
    let xp = x * peer;
    let yp = y * peer;
    if (yp < 0 && xp > 0) { // rechts oben
        pY = d * ((pupY - (pupY - yp) * (0.1 - 0.1*xp*yp*eyeshight) )/2 - 0.53); 
    } else {  // sonst überall
        pY = d * ((pupY - (pupY - yp) * 0.1 )/2 - 0.53); 
    }
//debugfield.innerHTML = xp + " / " + yp;
    pY = pY + 'px';
    signtag.style.setProperty('--pupY', pY);

    pL = d * ((pupL - (pupL - xp) * 0.05 )/2 + 0.46); 
    pL = pL + 'px';
    signtag.style.setProperty('--pupLeftX', pL);

    pR = d * ((pupR - (pupR - xp) * 0.05 )/2 + 0.5); 
    pR = pR + 'px';
    signtag.style.setProperty('--pupRightX', pR);
};


var   tp  = 100;
const tp1 =  13;
const tp2 =  80;

function unpeer() {
// Direktes Ansehen, Nichtschielen. Die Pupillen zur Augenmitte bewegen.
    if (tp < 100) {
        tp += 1;
        if (tp < tp1) { peer = 1 - tp/tp1;}
        if (tp > tp2) { peer = (tp - tp2) / (100 - tp2);}
        setPupillen();
        setTimeout(unpeer, 10);
    }
};

function nextUnpeer() {
// Ein unregelmäßges direktes Ansehen initiieren
    tp = 0;
    unpeer();
     let interval = Math.random()*8000 + 2000;
    if (showEyes) {
        setTimeout(nextUnpeer, interval);
    }
}


// Zwinkern
function twinkle() {
    var eyes = document.getElementsByClassName("eyes-open");
    for (var e = eyes.length-1; e > -1; e--) {
        eyes[e].className = "eyes-twinkle";
    }
    if (showEyes) {
        setTimeout(openAgain, 5000);
    }
};

function openAgain() {
    let eyes = document.getElementsByClassName("eyes-twinkle");
    for (var e = eyes.length-1; e > -1; e--) {
        eyes[e].className = "eyes-open";
    } 
    let nextTwinkle = Math.random()*7000 + 4000;
    if (showEyes) {
        setTimeout(twinkle, nextTwinkle);  
    }
};


function mimicCloseMouth() {
    let ggu = gu / 50;
    let ggl = gl / 50;
    shield.style.setProperty('background-color', 'hsl(0, 100%, 60%)');      
    
    function closeM() {
        if (Math.abs(gu) > 0.01) gu -= ggu;
        if (Math.abs(gl) > 0.01) { gl -= ggl; } else mouthClosed = true;

        if (!mouthClosed) {
            signtag.style.setProperty('--upper', gu);
            signtag.style.setProperty('--lower', gl);
            setTimeout(closeM, 5);
        }
    }
    closeM();
}


function stopFaceMimics() {
    if (pageLoaded) {
        if (mimicsActive) {
            signarea = document.getElementById("toucharea");
            signarea.removeEventListener('mousemove', mimic);
            mimicsActive = false;
            mouthClosed = false;
            closeEyes();
            mimicCloseMouth();
        }
console.log("SIGN: FaceMimik gestoppt.");
    } else {
        setTimeout(stopFaceMimics, 23);
    }
}


// Augen schließen
function closeEyes() {
    var eyes = document.getElementsByClassName("eyes-open");
    for (var e = eyes.length-1; e > -1; e--) {
        eyes[e].className = "eyes-close";
    } 
    var eyes = document.getElementsByClassName("eyes-twinkle");
    for (var e = eyes.length-1; e > -1; e--) {
        eyes[e].className = "eyes-close";
    } 
    setTimeout(eyesOff, 700);
}


function eyesOff() {
    var eyes = document.getElementsByClassName("eyes-close");
    for (var e = eyes.length-1; e > -1; e--) {
        eyes[e].className = "eyes";
    } 
    showEyes = false;
}

function unavoidClicked() {
// Wenn der Button geklicked wird, gibt's noch eine "Bist du sicher" Abfrage.
    $('buttonUnavoid').stop(false, true);
    $.confirm({
        title: 'Remove this sign?',
        content: 'This will remove all your settings associated with this sign! Are you sure?',
        icon: 'fa fa-warning',
        buttons: {
             ok: function() { unavoidConfirmed(); },
             cancel: function () {}
        }
    });
};

function unavoidConfirmed() {  
// Erst, wenn die "Bist du sicher"-Abfrage bejaht wird, wird die Seite unavoided.
    console.log("unavoid clicked");
    signtag.style.animation = 'ausblendung 1s';
    chrome.extension.sendMessage({
        type: 'unavoid-site',
        tabId: myTabId,
        avoidDomain: avoidDomain,
        url: url
    });
};

function pauseClicked() {
    console.log("Pause clicked");
    setPause(10);
    
};

function passbyClicked() {
    console.log("passby clicked", url, avoidDomain);
    chrome.extension.sendMessage({
        type: "pass-by!",
        tabId: myTabId,
        url: url
    });
};


function unavoidHoover() {
    if (displayMode == 'normal') {
        reminderarea.style.display = 'none';
        document.getElementById('unavoidHoover').style.display = 'block';
    }
};

function pauseHoover() {
  reminderarea.style.display = 'none';
  document.getElementById('pauseHoover').style.display = 'block';
};

function passbyHoover() {
  reminderarea.style.display = 'none';
  document.getElementById('passbyHoover').style.display = 'block';
};

function showReminder() {
    if (displayMode == 'normal') {
        document.getElementById('unavoidHoover').style.display = 'none';
        document.getElementById('pauseHoover').style.display = 'none';
        document.getElementById('passbyHoover').style.display = 'none';
        reminderarea.style.display = 'block';  
    }
}