// Für die Animationen im Schild
"use strict";

console.log("SIGN: sign.js started");

var reminderarea;
var signarea;
var signtag;
var shield;
var d;
var mimicsActive = false;

var x;
var y;
var pupY = -0.5;
var pupL = -0.26;
var pupR =  0.26;
var gu;
var gl;
var gL;
var gR;
var pY;
var pL;
var pR;
var showEyes = false;
var mouthClosed = false;
let peer = 1.0;

/*
var rgbToHex = function (rgb) { 
  var hex = Number(rgb).toString(16);
  if (hex.length < 2) {
       hex = "0" + hex;
  }
  return hex;
};

var fullColorHex = function(r,g,b) {   
  var red = rgbToHex(r);
  var green = rgbToHex(g);
  var blue = rgbToHex(b);
  return red+green+blue;
};
*/

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
        
        signarea.addEventListener('mousemove', mimic);

        // Initialisiere die Buttons
        $('#buttonUnavoid').on('click', function () { unavoidClicked(); });
        $('#buttonPause2').on('click',   function () { pauseClicked(); });
        $('#buttonPassby').on('click',  function () { passbyClicked(); });

        nextUnpeer();
        
    } else {
console.log("SIGN: Retry later.");        
        setTimeout(activateFaceMimics, 34);
    }
};
     

function mimic(m) {
    // Für die Gesichtsmimik
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
    }
    x = (( m.offsetX / d) - 0.5 ) * 2;
    y = (( m.offsetY / d) - 0.5 ) * 2;                
    let ax = Math.abs(x*x);
    let ay = Math.abs(y*y);
    gu = 0;
    gl = 0;
    if (avoidLevels[activeRole] == 3) {
        gl = ax * ay * 2;
    } else {
        if ( y > 0) {  // unterer Bereich
            gu = (y + ax * y) / 2;
            gl = (y + ax) / 3;
        } else {        // oberer Bereich
            if (x > 0) {  // rechts
                gu = y * x / 4;
                gl = ax * ay * 3;
                signtag.style.setProperty('--eye-size', 2 + ay*x);
            } else {  // links
                gu = 0 ;
                gl = ax / 2;
                signtag.style.setProperty('--eye-size', 2 + ay*x/2);
            }
        }
        
    }
    signtag.style.setProperty('--upper', gu);
    signtag.style.setProperty('--lower', gl);

    // Hintergrundfarbe
    if (y < 0 && x > 0) {
        let xx= 0.9 - x;
        let yy = -0.9 - y;
        xx *= xx;
        yy *= yy;
        let z = (xx + yy) * 4;
        if (z > 1) { z = 1};
        let hue   = ( z - 1 )*(-140);
        let dark  = 60 + ( z - 1 ) * 50;
        let color = 'hsl(' + hue + ',100%,' + dark + '%)';
        if (avoidLevels[activeRole] != 3) {
            shield.style.setProperty('background-color', color);      
        }
    } else {
        shield.style.setProperty('background-color', 'hsl(0, 100%, 60%)');      
    }
    
    setPupillen();
};


function setPupillen() {
    // Pupillen
    let xp = x * peer;
    let yp = y * peer;
    if (yp < 0 && xp > 0) {
        pY = d * ((pupY - (pupY - yp) * 0.19 )/2 - 0.53); 
    } else {
        pY = d * ((pupY - (pupY - yp) * 0.1 )/2 - 0.53); 
    }
    pY = pY + 'px';
    signtag.style.setProperty('--pupY', pY);

    pL = d * ((pupL - (pupL - xp) * 0.05 )/2 + 0.46); 
    pL = pL + 'px';
    signtag.style.setProperty('--pupLeftX', pL);

    pR = d * ((pupR - (pupR - xp) * 0.05 )/2 + 0.5); 
    pR = pR + 'px';
    signtag.style.setProperty('--pupRightX', pR);
};


var tp = 100;
const tp1 = 13;
const tp2 = 80;

function unpeer() {
    if (tp < 100) {
        tp += 1;
        if (tp < tp1) { peer = 1 - tp/tp1;}
        if (tp > tp2) { peer = (tp - tp2) / (100 - tp2);}
        setPupillen();
        setTimeout(unpeer, 10);
    }
};


function nextUnpeer() {
    tp = 0;
    unpeer();
    setTimeout(nextUnpeer, Math.random()*8000 + 2000);
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
console.log("SIGN: eyes", e);
    } 
    var eyes = document.getElementsByClassName("eyes-twinkle");
    for (var e = eyes.length-1; e > -1; e--) {
        eyes[e].className = "eyes-close";
console.log("SIGN: eyes twinkle", e);
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
    showPauseDialog();
    
};

function passbyClicked() {
    console.log("passby clicked", url, avoidDomain);
    chrome.extension.sendMessage({
        type: "pass-by!",
        tabId: myTabId,
        url: url
    });
    
};
