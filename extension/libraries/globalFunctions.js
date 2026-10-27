// globalFunctions
// Funktionen die an mehreren Stellen im Programm benötigt werden. 

console.log("GlobalFunctions included");




// Um Domains, Subdomains usw. aus einer URL herauszuholen
/*
// Dies war die Vorläufer-Funktion von splitUrl(), die das noch zu Fuß gemacht hat. 
function getHostName(url) {
    // identifiziert aus der URL die gesamte Domain samt Subdomains
    // input: "https://www.asubdomain.adomain.com/afolder/asubfolder?pfwoifuasfasd"
    // output: "asubdomain.adoumain.com"
    var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
    if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
        return match[2];
    } else {
        return null;
    }
}
*/


function splitUrl(url) {
    // identifiziert die mainDomain (hostName), allfällig Subdomains und Pfade.
    // Subdomains UND Pfade werden falls sie sinnvoll erscheinen GEMEINSAM in der Variablen subDomains als Liste übergeben.
    // Sinnvoll sind lesbare Bezeichnungen mit mehr als 3 und weniger als 20 Zeichen.
    // Warum? Weil der User entscheiden soll, ob er nur eine Subdomain oder einen Pfad blockieren will.
    // Aufgrund von 'xs' oder 'vis' kann er das nicht. 
    // Sehr lange Pfadnamen sind meist schon die Filenamen, die auch keinen Sinn machen.
    // Etwa: 'blog-22-03-2012_Why_I_think_that_long_filenames_matter.php'
    // Ordner und Subdomainnamen sind meistens kurz und prägnant.
    

    // let parser = new URL(urlString);  // Ob das nicht aus so ginge?
    var parser   = document.createElement('a');
    parser.href  = url;
    var hostName = parser.hostname;
    var path     = parser.pathname;
    var domain   = hostName;
    var search   = parser.search;
    var parts    = {};
    // Look for subdomains
    hostName = hostName.replace('www.', '');
    if ((hostName != null) && (hostName != "")) {
        parts = hostName.split('.');
        if (parts != null && parts.length > 1) {
            domain = '.' + parts.pop();
            domain = parts.pop() + domain;
            if (parts.length > 0) {
                if(domain.length < 6) { // für .ac.at 
                    domain = parts.pop() + '.' + domain;
                }
            }
        }
        
        // jetzt sollten in domain Dinge wie amazon.com oder tuwien.ac.at drin stehen.

        //if (domain == hostname) { hostname = "";}
    } else {
console.log("URL: hostname NULL");  
        parts = {};
    }
    var subDomains = parts;
    parts = path.split('/');
    for (var i=0; (i < parts.length) && (i < 4); i++) {
        let part = parts[i];
        if ((part.length > 2) && (part.length < 20) && (part.toUpperCase() != part.toLowerCase())) {
        // Die letzte Abfrage schließt reine Nummern und Sonderzeichen aus. So etwas wie '$40304098234' was durchaus vorkommt
            subDomains.push(part);
        }
    }
console.log("URL:   ", url, " --> ", domain, subDomains);
    
    return [domain, subDomains];
}





// Alternatives
function newAlternative(url) {
    let newAlternative   = {};
    let newColorHue = Math.floor(Math.random() * 360);
    let newColorSat = 30 + Math.random() * 20;
    let newColorLum = 70 + Math.random() * 20;
    let newColor    = "hsl(" +newColorHue+ ", "+newColorSat+ "%, " +newColorLum+ "%)"
    
    
    let [domain, sub] = splitUrl(url);
    newAlternative.url   = url;
    
    newAlternative.name  = domain;
    newAlternative.claim = '';
    newAlternative.icon  = '';
    newAlternative.color = newColor;
    newAlternative.affilateLink = '';
    return newAlternative;
}

