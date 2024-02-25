// Hier werden manche Popup-Dialoge definiert.

function showPauseDialog() {
    // Zeigt ein Popup-Window mit einer Auswahl von Pausezeiten an.
    $.confirm({
        title: 'Shape My Web',
        content: 'For how long do you want to ignore your own will?',
        icon: 'fa fa-pause',
        buttons: {
            b5m: {
                text: '5min',
                btnClass: 'btn-green',
                keys: ['1'],
                action: function () {
                    setPause(5);
                }
            },
            b10m: {
                text: '10min',
                btnClass: 'btn-green',
                keys: ['2'],
                action: function () {
                    setPause(10);
                }
            },
            b30m: {
                text: '30min',
                btnClass: 'btn-orange',
                keys: ['3'],
                action: function () {
                    setPause(30);
                }
            },
            b1h: {
                text: '1hour',
                btnClass: 'btn-orange',
                keys: ['4'],
                action: function () {
                    setPause(60);
                }
            },
            b3h: {
                text: '3hours',
                btnClass: 'btn-red',
                keys: ['5'],
                action: function () {
                    setPause(180);
                }
            },
            b8h: {
                text: '8hours',
                btnClass: 'btn-red',
                keys: ['6'],
                action: function () {
                    setPause(480);
                }
            },
            cancel: function () {}
        }
    });
}

/*
function showStopper(message, avoidDomain) {

    $.confirm({
        title: '<em>"' + reminder + '"</em>',
        content: message,
        icon: 'fa fa-warning',
        buttons: {
            alternatives: {
                text: 'show me alternatives',
                btnClass: 'btn-green',
                keys: ['enter', 'space', 'return', 'alt'],
                action: function () {
                    $.alert('Please AVOID this website!');
                }
            },
            ignore: {
                text: 'ignore my will',
                btnClass: 'btn-red',
                keys: ['i'],
                action: function () {
                    $.alert('OK - this time you may pass by!');
                }
            },
            unavoid: {
                text: "don't annoy me here again",
                btnClass: 'btn-black',
                keys: ['o', 'O'],
                action: function () {
                    unAvoidSite();
                }
            },
            pause: {
                text: 'pause',
                btnClass: 'btn-blue',
                keys: ['p', 'P'],
                action: function () {
                    showPauseDialog();
                }
            }
        }
    });

}
*/

function setPause(minutes) { 
    // teilt der bck mit, dass pausiert werden soll.
    chrome.runtime.sendMessage(
        {   send: "cnt",
            recv: "bck",
            type: "pause",
            minutes: minutes
        }, function() {
console.log('Pause aktiviert:', minutes, "Minuten.");
        }
    );
}
