// Grundfunktionen zur Kommunikation


function send2content(message, callback) {
    // sendet eine Message an die content.js des aktuell geöffneten Tabs
    // Die Message muss das folgende Format haben: 
    //   { mType: message-type, identifier1: data, identif2: data2 }
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
console.log("My own tab.id:", tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, message, callback);
    });
};



function catchError() {
    var lastError = chrome.runtime.lastError;
    if (lastError) {
        console.log("Error:" + lastError.message);
        return lastError;
    } else {
        return false;
    }
}
