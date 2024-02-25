// Analyze URL
// Um Domains, Subdomains usw. aus einer URL herauszuholen

/*
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
function getDomain(url) {
    // identifiziert die mainDomain (hostName), allfällig Subdomains und Pfade.
    // Subdomains UND Pfade werden falls sie sinnvoll erscheinen GEMEINSAM in der Variablen subDomains als Liste übergeben.
    // Sinnvoll sind lesbare Bezeichnungen mit mehr als 3 und weniger als 20 Zeichen.
    // Warum? Weil der User entscheiden soll, ob er nur eine Subdomain oder einen Pfad blockieren will.
    // Aufgrund von 'xs' oder 'vis' kann er das nicht. 
    // Sehr lange Pfadnamen sind meist schon die Filenamen, die auch keinen Sinn machen.
    // Etwa: 'blog-22-03-2012_Why_I_think_that_long_filenames_matter.php'
    // Ordner und Subdomainnamen sind meistens kurz und prägnant.
    var parser   = document.createElement('a');
    parser.href  = url;
    var hostName = parser.hostname;
    var path     = parser.pathname;
    var domain   = hostName;
    var search   = parser.search;
    // Look for subdomains
    hostName = hostName.replace('www.', '');
    if (hostName != null) {
        var parts = hostName.split('.');
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
    }
    var subDomains = parts;
    parts = path.split('/');
    for (var i=0; (i < parts.length) && (i < 3); i++) {
        let part = parts[i];
        if ((part.length > 3) && (part.length < 20) && (part.toUpperCase() != part.toLowerCase())) 
        // Die letzte Abfrage schließt reine Nummern und Sonderzeichen aus. So etwas wie '$40304098234' was durchaus vorkommt
            subDomains.push(parts[i]);
    }
console.log("URL:", domain, subDomains, search);
    
    return [domain, subDomains, search];
}

