// Wird sowohl im Popup als auch auf der Showstopperseite verwendet.
// Daher in eigenem Modul

let recentDisplayMode = "";

function showDomainInfo(displayMode) {
        // Infobereich
console.log("showDomainInfo: url", url);
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
(A1) But you can also block just | (B1) the service 'stories' from this website.
(A1) But you can also block just | (B2) one of the services 'a', 'b' from this website.
(A2) You can also additionally block | (B1) the service 'b' from this website.
(A2) You can also additionally block | (B2) one of the services 'b', 'c' from this website.

*/
            
    recentDisplayMode = displayMode;
    
    if (url) {
        let mainDomain, newSubs, search;
        let domainInfo = document.getElementById("domainInfo");
        [mainDomain, newSubs, search] = splitUrl(url);
        avoidDomain = mainDomain;
console.log("showDomainInfos: Sub", subDomains, newSubs);
        if (!subDomains || subDomains.length == 0) { // keine Subdomains
            document.getElementById("domainSolo").innerHTML = mainDomain;
            document.getElementById("domainSolo2").innerHTML = mainDomain;
            document.getElementById("infoDom").style.display = "block";
        } else { // Subdomains
            if (subDomains.length < 2) {
                document.getElementById("domainSub").innerHTML = mainDomain;
                let sub = subDomains[0];
                document.getElementById("avoidedSub").innerHTML = sub;
                document.getElementById("infoSub").style.display = "block";
                newSubs = newSubs.remove(subDomains[0]);
            } else {
                document.getElementById("domainSubs").innerHTML = mainDomain;
                showSubdomains();
                document.getElementById("infoSubs").style.display = "block";
                newSubs = newSubs.filter(item => !subDomains.includes(item));
            }
            document.getElementById("domainSolo2").innerHTML = mainDomain;
        }
console.log("showDomainInfos: Su2", subDomains, newSubs);

        if (displayMode == 'edit') {  // das ist der Editmodus)
            showAddSubs(newSubs);
            domainInfo.style.display = "block";
        } else {
            domainInfo.style.display = "none";
        }
    }
}




function showSubdomains() {
// Die Subdomains und Folder sollen angezeigt werden.
    let subdomainsArea = document.getElementById('avoidedSubs');
    let fillString = '';
    for (var a = 0; a < subDomains.length; a++) {
        fillString += "<span class='subdomain'>";
        fillString += subDomains[a];
        if (recentDisplayMode == 'edit') {
            fillString += "<button id='buttonSub" + a + "' class='buttonSmallRemove'>X</button>";
        }
        fillString += "</span>";
        if ( a<subDomains.length-1 ) {
            fillString += ", ";
        } else {
            fillString += " ";
        }
    }
    subdomainsArea.innerHTML = fillString;
    if (recentDisplayMode == 'edit') {
        for (var a = 0; a < subDomains.length; a++) {
            document.getElementById("buttonSub"+a).addEventListener('click', removeSub);
        }
    }
}

function removeSub(object) {
    let button = object.target;
    let element = parseInt(button.id.replace('buttonSub',''));
    subDomains.splice(element, 1);
    showSubdomains();
    sendChanges();
}


function showAddSubs(newSubs) {
    if (newSubs && newSubs.length > 0) {
        document.getElementById("advancedOff").style.display = "block";
        document.getElementById("advancedNo").style.display = "none";
        let buttonAdvanced = document.getElementById('advanced');
        buttonAdvanced.addEventListener('click', function() {
            document.getElementById('infoline').style.display = 'none';
            document.getElementById('domainInfo').style.display = 'none';
            document.getElementById('advancedOn').style.display = 'block';
            document.getElementById('advancedOff').style.display = 'none';
            let buttonAvoidAll = document.getElementById('blockWholeSite');
            buttonAvoidAll.addEventListener('click', function () {
                chrome.extension.sendMessage({
                    type: 'avoid-site',
                    url: url
                });
                window.close();
            });
            
            let buttonAdvancedBack = document.getElementById('advancedBack');
            buttonAdvancedBack.addEventListener('click', function() {
                document.getElementById('infoline').style.display = 'block';
                document.getElementById('domainInfo').style.display = 'block';
                document.getElementById('advancedOn').style.display = 'none';
                document.getElementById('advancedOff').style.display = 'block';
            });
        });
        let subdomainSection = document.getElementById('subdomainSection');
        subdomainSection.style.display = 'block';
        if (subDomains) {
            if (subDomains.length == 0) {
                document.getElementById('addSubA1').style.display = 'inline-block';
                document.getElementById('addSubA2').style.display = 'none';
            } else {
                document.getElementById('addSubA1').style.display = 'none';
                document.getElementById('addSubA2').style.display = 'inline-block';
            }
        } else {
            console.log('SDO: showAddSubs NO subDomains.');
        }
        if (newSubs.length == 1) {
            document.getElementById('addSubB1').style.display = 'inline-block';
            document.getElementById('addSubB2').style.display = 'none';
        } else {
            document.getElementById('addSubB1').style.display = 'none';
            document.getElementById('addSubB2').style.display = 'inline-block';
        }
        let buttonsNew = '';
        for (var sub=0; sub < newSubs.length; sub++) {
            let button = '<button id="buttonSubAdd'+sub+'">'+newSubs[sub]+'</button>';
            buttonsNew += button;
        }
        document.getElementById('buttonSubdom').innerHTML = buttonsNew;
        let avoidSubs = [];
        for (var sub=0; sub < newSubs.length; sub++) { // add EventListeners
            let buttonId  = 'buttonSubAdd'+sub;
            let button    = document.getElementById(buttonId);
            let buttonSub = button.innerHTML;
            button.addEventListener('click', function() {
console.log('ShowDomainInfo:', buttonId, 'clicked', newSubs, sub);
                avoidSubs.push(buttonSub);
                newSubs.splice(sub-1, 1);
//                            subdomainSection.style.display = 'none';
                subDomains = subDomains.concat(avoidSubs);
console.log('ShowDomainInfo: avoided Subs', subDomains, newSubs);
                showSubdomains();
                showAddSubs(newSubs);
                sendChanges();
           });
        }
    } else {
        let subdomainSection = document.getElementById('subdomainSection');
        subdomainSection.style.display = 'none';
    }

}