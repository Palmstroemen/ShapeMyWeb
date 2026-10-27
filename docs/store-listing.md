# Store-Einträge

Texte zum Einfügen in den Chrome Web Store, auf addons.mozilla.org (AMO) und in
Microsoft Edge Add-ons. Paket für alle drei: `npm run build` → `dist/shapemyweb-<version>.zip`.

Die **Kurzbeschreibung** kommt automatisch aus dem Manifest
(`extDescription` in `extension/_locales/*/messages.json`, max. 132 Zeichen).

**Datenschutzerklärung (URL):**
https://github.com/Palmstroemen/ShapeMyWeb/blob/main/docs/privacy.md

---

## Deutsch

**Name:** ShapeMyWeb

**Kurzbeschreibung** (Manifest, 117 Zeichen):
> Dein eigenes Stoppschild für Webseiten, die dir nicht guttun – mit persönlicher Erinnerung und besseren Alternativen.

**Ausführliche Beschreibung:**

```
Nicht blockieren – umlenken.

Manche Webseiten fressen deine Zeit, manche passen nicht mehr zu deinen Überzeugungen. ShapeMyWeb stellt dir dort ein Stoppschild in den Weg – mit deinen eigenen Worten und mit Links zu den Seiten, die du stattdessen besuchen willst.

★ DEIN STOPPSCHILD
Statt der Webseite siehst du einen Satz, den du dir selbst geschrieben hast: „Frisst nur meine Zeit“, „Zahlen hier keine Steuern“, „Lieber beim Buchhändler ums Eck“.

★ BESSERE ALTERNATIVEN
Hinterlege Webseiten, die du stattdessen nutzen möchtest – etwa den Online-Shop aus deiner Region statt des großen Versandhändlers. Ein Klick, und du bist dort.

★ ROLLEN FÜR JEDE LEBENSLAGE
Ich, zu Hause, Arbeit, unterwegs: Für jede Rolle legst du fest, wie streng eine Seite behandelt wird – von „einmal pro Minute erinnern“ bis „gesperrt“.

★ TEILBEREICHE
Nur den Sportteil der Zeitung meiden, den Rest aber lesen? Kein Problem.

★ PAUSE UND „TROTZDEM WEITER“
Du entscheidest. Pausiere die Erweiterung für ein paar Minuten oder geh ausnahmsweise doch auf die Seite.

★ DEINE DATEN BLEIBEN BEI DIR
Keine Konten, kein Tracking, keine Werbung. ShapeMyWeb schickt nichts an uns und braucht keinen Zugriff auf den Inhalt von Webseiten. Deine Liste wird über die Synchronisation deines Browsers zwischen deinen Geräten abgeglichen.

★ OPEN SOURCE
Der Quellcode ist offen: https://github.com/Palmstroemen/ShapeMyWeb

So geht's: Webseite öffnen, auf das ShapeMyWeb-Symbol klicken, auf das Stoppschild klicken und einen Satz schreiben. Oder in der Adresszeile „avoid“, Leertaste und Enter eingeben.
```

---

## English

**Name:** ShapeMyWeb

**Short description** (manifest, 108 characters):
> Your own stop sign for websites that aren't good for you – with a personal reminder and better alternatives.

**Detailed description:**

```
Don't just block – redirect.

Some websites eat your time, others no longer match your values. ShapeMyWeb puts a stop sign in your way – in your own words, with links to the websites you would rather visit instead.

★ YOUR STOP SIGN
Instead of the website you see a sentence you wrote yourself: "Just eats my time", "They don't pay taxes here", "Rather the bookshop around the corner".

★ BETTER ALTERNATIVES
Add websites you would rather use – like the online shop from your region instead of the big marketplace. One click and you are there.

★ ROLES FOR EVERY SITUATION
Me, home, work, public: for each role you decide how strictly a website is treated – from "remind me once a minute" to "blocked".

★ SECTIONS
Avoid only the sports section of a newspaper but keep reading the rest? No problem.

★ PAUSE AND "CONTINUE ANYWAY"
You decide. Pause the extension for a few minutes or go to the website just this once.

★ YOUR DATA STAYS WITH YOU
No accounts, no tracking, no ads. ShapeMyWeb sends nothing to us and needs no access to the content of websites. Your list is synced between your devices by your browser's own sync.

★ OPEN SOURCE
The source code is open: https://github.com/Palmstroemen/ShapeMyWeb

How it works: open a website, click the ShapeMyWeb icon, click the stop sign and write a sentence. Or type "avoid", space and enter in the address bar.
```

---

## Chrome Web Store: Angaben im Developer Dashboard

**Kategorie:** Productivity → Workflow & Planning (alternativ: Tools)

**Single purpose / Alleiniger Zweck:**
> ShapeMyWeb lets users keep a personal list of websites they want to avoid. When such a website is opened, the extension shows a stop page with the user's own reminder and user-defined alternative websites instead.

**Begründung der Berechtigungen:**

| Permission      | Justification |
|-----------------|---------------|
| `webNavigation` | Detects when a tab navigates to a website on the user's personal avoid list so the extension can show its stop page instead. URLs are only compared locally against the list; nothing is stored or transmitted. |
| `tabs`          | Reads the URL of the active tab so the popup can offer to avoid the current website, and redirects a tab to the extension's stop page. |
| `storage`       | Stores the user's avoid list and settings (synced via the browser's own sync if enabled). |
| `history`       | Removes the extension's own stop page from the browsing history after it was shown. The history is never read. |

**Remote code:** No, I am not using remote code.

**Datennutzung (Data usage):** keine Kategorie ankreuzen – die Erweiterung erhebt
keine Nutzerdaten. Alle drei Zusicherungen bestätigen (kein Verkauf, keine
zweckfremde Nutzung, keine Bonitätsprüfung).

**Hinweis bei bestehendem Eintrag:** Falls ShapeMyWeb früher schon im Chrome Web
Store veröffentlicht war, das neue Paket als **Update dieses Eintrags**
hochladen, nicht als neue Erweiterung – sonst gehen Nutzer und Bewertungen verloren.

---

## Firefox (addons.mozilla.org)

**Zusammenfassung / Summary** (max. 250 Zeichen): die Kurzbeschreibung oben.

**Beschreibung:** die ausführliche Beschreibung oben (AMO erlaubt einfache
Formatierung, die ★-Zeilen funktionieren auch als Klartext).

**Kategorien (Vorschlag):** Shopping, Other

**Datenerhebung:** Im Manifest ist `data_collection_permissions: none`
eingetragen; beim Hochladen nichts weiter auswählen.

**Quellcode:** Nicht nötig – das Paket enthält keinen minifizierten oder
gebündelten Code.

**Hinweis für die Prüfer (Notes to reviewer):**
> No build step: the uploaded ZIP is the plain `extension/` folder of https://github.com/Palmstroemen/ShapeMyWeb (tag v<version>). The extension needs no host permissions; it redirects tabs to its own stop page via webNavigation + tabs.update.

---

## Microsoft Edge Add-ons

Dasselbe ZIP wie für Chrome. Texte und Berechtigungsbegründungen aus dem
Chrome-Abschnitt übernehmen. Kategorie: Productivity.

---

## Noch zu erstellen (Punkt 3)

- Screenshots 1280×800 (mind. 1, besser 3–5): Stoppschild mit Alternativen,
  Popup, Editmode, Willkommensseite
- Chrome: kleine Werbekachel 440×280
- Icon 128×128 ist vorhanden (`extension/images/icon-128.png`)
