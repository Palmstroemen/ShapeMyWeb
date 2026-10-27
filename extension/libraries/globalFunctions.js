// globalFunctions
// Funktionen die an mehreren Stellen im Programm benötigt werden.
// Wird sowohl im Background (Service Worker bzw. Event Page) als auch in den
// Extension-Seiten geladen. Darf daher kein `document` voraussetzen.


function splitUrl(url) {
    // identifiziert die mainDomain (hostName), allfällig Subdomains und Pfade.
    // Subdomains UND Pfade werden falls sie sinnvoll erscheinen GEMEINSAM in der Variablen subDomains als Liste übergeben.
    // Sinnvoll sind lesbare Bezeichnungen mit mehr als 3 und weniger als 20 Zeichen.
    // Warum? Weil der User entscheiden soll, ob er nur eine Subdomain oder einen Pfad blockieren will.
    // Aufgrund von 'xs' oder 'vis' kann er das nicht.
    // Sehr lange Pfadnamen sind meist schon die Filenamen, die auch keinen Sinn machen.
    // Etwa: 'blog-22-03-2012_Why_I_think_that_long_filenames_matter.php'
    // Ordner und Subdomainnamen sind meistens kurz und prägnant.
    let parser;
    try {
        parser = new URL(url);
    } catch (error) {
        return ["", []];
    }
    let hostName = parser.hostname.replace(/^www\d?\./, '');
    let domain   = hostName;
    let parts    = [];
    if (hostName != "") {
        parts = hostName.split('.');
        if (parts.length > 1) {
            domain = '.' + parts.pop();
            domain = parts.pop() + domain;
            if (parts.length > 0) {
                if (domain.length < 6) { // für .ac.at
                    domain = parts.pop() + '.' + domain;
                }
            }
        }
        // jetzt sollten in domain Dinge wie amazon.com oder tuwien.ac.at drin stehen.
    }
    let subDomains = parts;
    let pathParts  = parser.pathname.split('/');
    for (let i = 0; (i < pathParts.length) && (i < 4); i++) {
        let part = pathParts[i];
        if ((part.length > 2) && (part.length < 20) && (part.toUpperCase() != part.toLowerCase())) {
        // Die letzte Abfrage schließt reine Nummern und Sonderzeichen aus. So etwas wie '$40304098234' was durchaus vorkommt
            subDomains.push(part);
        }
    }
    return [domain, subDomains];
}


function isWebUrl(url) {
    // Nur http(s)-Adressen werden geprüft bzw. als Alternative akzeptiert.
    try {
        let protocol = new URL(url).protocol;
        return protocol == 'http:' || protocol == 'https:';
    } catch (error) {
        return false;
    }
}


function escapeHtml(text) {
    // Für alles, was per innerHTML in die Seite kommt (Reminder, Claims, Domains, ...)
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


function loadFragment(selector, file) {
    // Ersatz für jQuerys $(selector).load(file): lädt ein HTML-Fragment der Extension.
    return fetch(file)
        .then(response => response.text())
        .then(html => { document.querySelector(selector).innerHTML = html; });
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
