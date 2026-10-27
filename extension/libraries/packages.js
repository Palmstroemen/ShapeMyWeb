// Schnellstart-Pakete: fertige Erinnerungen und Alternativen für große Webseiten.
// Die Daten stecken in der Extension selbst; es wird nichts aus dem Netz geladen.
// Vor jedem Release prüfen: npm run check-links
//
// regions: Länder (ISO-Code), für die eine Alternative vorausgewählt wird.
//          Ohne regions gilt sie überall.
"use strict";

// Für Amazon und Temu dieselben Alternativen
const SHOPPING_ALTERNATIVES = [
    {
        url: 'https://www.genialokal.de/', name: 'genialokal.de', regions: ['DE'],
        claim: { de: 'Bücher von rund 700 inhabergeführten Buchhandlungen',
                 en: 'Books from around 700 independent bookshops',
                 it: 'Libri da circa 700 librerie indipendenti' }
    },
    {
        url: 'https://www.shoepping.at/', name: 'shöpping.at', regions: ['AT'],
        claim: { de: 'Der Marktplatz für Händler aus Österreich',
                 en: 'The marketplace for Austrian retailers',
                 it: 'Il marketplace dei commercianti austriaci' }
    },
    {
        url: 'https://www.willhaben.at/', name: 'willhaben.at', regions: ['AT'],
        claim: { de: 'Gebraucht statt neu',
                 en: 'Second-hand instead of new',
                 it: 'Usato invece di nuovo' }
    },
    {
        url: 'https://www.kleinanzeigen.de/', name: 'kleinanzeigen.de', regions: ['DE'],
        claim: { de: 'Gebraucht statt neu',
                 en: 'Second-hand instead of new',
                 it: 'Usato invece di nuovo' }
    }
];

const PACKAGES = [
    {
        id: 'amazon', title: 'Amazon',
        domains: [{ domain: 'amazon.de', subDomains: [] }, { domain: 'amazon.com', subDomains: [] }],
        reminder: { de: 'Lieber bei Händlern aus der Region.',
                    en: 'Rather buy from local shops.',
                    it: 'Meglio comprare dai negozi locali.' },
        alternatives: SHOPPING_ALTERNATIVES
    },
    {
        id: 'temu', title: 'Temu',
        domains: [{ domain: 'temu.com', subDomains: [] }],
        reminder: { de: 'Billig kostet am Ende mehr.',
                    en: 'Cheap ends up costing more.',
                    it: 'Il risparmio alla fine costa di più.' },
        alternatives: SHOPPING_ALTERNATIVES
    },
    {
        id: 'youtube', title: 'YouTube',
        domains: [{ domain: 'youtube.com', subDomains: [] }],
        reminder: { de: 'Nur noch bewusst schauen.',
                    en: 'Only watch on purpose.',
                    it: 'Guardo solo con intenzione.' },
        alternatives: [
            { url: 'https://on.orf.at/', name: 'ORF ON', regions: ['AT'],
              claim: { de: 'Sendungen des ORF', en: 'Programmes from ORF', it: 'I programmi della ORF' } },
            { url: 'https://www.ardmediathek.de/', name: 'ARD Mediathek', regions: ['DE'],
              claim: { de: 'Sendungen der ARD', en: 'Programmes from ARD', it: 'I programmi della ARD' } },
            { url: 'https://www.arte.tv/', name: 'arte.tv',
              claim: { de: 'Kultur und Dokumentationen', en: 'Culture and documentaries', it: 'Cultura e documentari' } }
        ]
    },
    {
        id: 'google-search', title: { de: 'Google-Suche', en: 'Google Search', it: 'Ricerca Google' },
        // Nur die Suche, nicht Gmail, Docs & Co.
        domains: [{ domain: 'google.com', subDomains: ['search'] },
                  { domain: 'google.de',  subDomains: ['search'] },
                  { domain: 'google.at',  subDomains: ['search'] }],
        reminder: { de: 'Suchen ohne Datensammler.',
                    en: 'Search without data collectors.',
                    it: 'Cercare senza raccolta di dati.' },
        alternatives: [
            { url: 'https://www.ecosia.org/', name: 'Ecosia',
              claim: { de: 'Suchen und Bäume pflanzen', en: 'Search and plant trees', it: 'Cerca e pianta alberi' } },
            { url: 'https://www.startpage.com/', name: 'Startpage',
              claim: { de: 'Google-Ergebnisse ohne Tracking', en: 'Google results without tracking', it: 'Risultati di Google senza tracciamento' } },
            { url: 'https://duckduckgo.com/', name: 'DuckDuckGo',
              claim: { de: 'Suchen ohne Profil', en: 'Search without a profile', it: 'Cerca senza profilo' } }
        ]
    },
    {
        id: 'social', title: 'Facebook, Instagram, X',
        domains: [{ domain: 'facebook.com', subDomains: [] }, { domain: 'instagram.com', subDomains: [] },
                  { domain: 'x.com', subDomains: [] }, { domain: 'twitter.com', subDomains: [] }],
        reminder: { de: 'Weniger scrollen, mehr leben.',
                    en: 'Less scrolling, more living.',
                    it: 'Meno scroll, più vita.' },
        alternatives: [
            { url: 'https://joinmastodon.org/', name: 'Mastodon',
              claim: { de: 'Soziales Netzwerk ohne Konzern', en: 'A social network without a corporation', it: 'Un social network senza multinazionale' } },
            { url: 'https://pixelfed.org/', name: 'Pixelfed',
              claim: { de: 'Fotos teilen ohne Werbung', en: 'Share photos without ads', it: 'Condividi foto senza pubblicità' } }
        ]
    },
    {
        id: 'google-maps', title: 'Google Maps',
        domains: [{ domain: 'google.com', subDomains: ['maps'] },
                  { domain: 'google.de',  subDomains: ['maps'] },
                  { domain: 'google.at',  subDomains: ['maps'] }],
        reminder: { de: 'Karten ohne Bewegungsprofil.',
                    en: 'Maps without tracking my movements.',
                    it: 'Mappe senza tracciare i miei spostamenti.' },
        alternatives: [
            { url: 'https://www.openstreetmap.org/', name: 'OpenStreetMap',
              claim: { de: 'Die freie Weltkarte', en: 'The free map of the world', it: 'La mappa libera del mondo' } },
            { url: 'https://www.bergfex.at/', name: 'bergfex', regions: ['AT', 'DE'],
              claim: { de: 'Touren, Wetter und Karten für draußen', en: 'Tours, weather and maps for outdoors', it: 'Percorsi, meteo e mappe per l\'aria aperta' } }
        ]
    }
];


function regionsFor(languages) {
    // Aus den Spracheinstellungen ("de-AT", "en-US", "de") die Länder ableiten.
    // Nur "de" ohne Land: Österreich und Deutschland.
    let regions = [];
    for (let language of languages) {
        let [lang, country] = language.split('-');
        if (country) regions.push(country.toUpperCase());
        else if (lang == 'de') regions.push('AT', 'DE');
    }
    return [...new Set(regions)];
}


function preselected(alternative, regions) {
    return !alternative.regions || alternative.regions.some(r => regions.includes(r));
}


function localized(texts, lang) {
    // Markennamen sind einfache Texte, alles andere gibt es pro Sprache.
    return typeof texts === 'string' ? texts : texts[lang] ?? texts.en;
}
