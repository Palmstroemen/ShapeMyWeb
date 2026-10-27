# ShapeMyWeb

Eine Browser-Extension für Chrome und Firefox, mit der du Webseiten bewusst
vermeidest – eine persönliche Blacklist.

Statt einer Webseite erscheint ein Stoppschild mit deiner eigenen Erinnerung
(„zu viel bunt ist nicht gesund“) und – wenn du willst – Links zu
alternativen Webseiten, die du stattdessen besuchen möchtest.

## Funktionen

- **Seite vermeiden:** im Popup auf das Stoppschild klicken oder in der
  Adresszeile `avoid`, Leertaste und Enter eingeben.
- **Teilbereiche:** nur bestimmte Bereiche einer Seite sperren
  (z. B. `derstandard.at/story`).
- **Rollen:** vier Rollen (Person, Zuhause, Arbeit, Kaffee) mit je eigenem
  Avoid-Level pro Seite. Die aktive Rolle gilt pro Gerät.
- **Avoid-Levels:** 0 = frei, 1 = höchstens einmal pro Minute warnen,
  2 = immer warnen, 3 = sperren ohne „trotzdem weiter“.
- **Pause und Pass-by:** die Extension für einige Minuten pausieren oder eine
  Seite einmal durchlassen.
- **Alternativen:** eigene Links mit kurzem Satz und Farbe.

Blacklist und Einstellungen werden über `storage.sync` zwischen deinen Geräten
synchronisiert (Google- bzw. Firefox-Konto).

## Projektstruktur

```
extension/          die Extension selbst (Manifest V3)
  background.js     Service Worker (Chrome) bzw. Event Page (Firefox)
  popup.*           Menü beim Klick auf das Icon
  showstopper.*     das Stoppschild bzw. der Editmode
  smw-setup.*       Liste aller vermiedenen Seiten
  libraries/        gemeinsame Hilfsfunktionen, Übersetzung
  _locales/         de, en, it
test/               Unit-Tests (Node) und Browser-Smoke-Tests
docs/               Konzepte und Skizzen
TODO.md             offene Punkte
```

## Entwicklung

Voraussetzungen: Node.js ≥ 20, für die Browser-Tests Chromium und Firefox.

```sh
npm install
npm test                 # Unit-Tests der Background-Logik (schnell)
npm run test:e2e         # Smoke-Tests in Chromium und Firefox (ca. 1–2 Minuten)
npm run lint             # Firefox-Linter (web-ext)
npm run build            # ZIP für Chrome Web Store / addons.mozilla.org nach dist/
```

Pfade zu den Browsern lassen sich mit `CHROME_PATH` und `FIREFOX_PATH` setzen.

### Extension lokal laden

- **Chrome:** `chrome://extensions` → Entwicklermodus → „Entpackte Erweiterung
  laden“ → Ordner `extension/` wählen.
- **Firefox:** `npm run start:firefox`, oder `about:debugging` → „Dieser
  Firefox“ → „Temporäres Add-on laden“ → `extension/manifest.json`.

### Hinweise zur Architektur

Unter Manifest V3 kann der Browser den Hintergrundprozess jederzeit beenden.
`background.js` hält deshalb **keinen Zustand in globalen Variablen**:

| Speicher          | Inhalt                                                      |
|-------------------|-------------------------------------------------------------|
| `storage.sync`    | Blacklist (ein Schlüssel `bl:<domain>` pro Seite), Settings |
| `storage.local`   | aktive Rolle, Pausezeit, Ende der Pause                     |
| `storage.session` | temporäre Whitelist (Pass-by, Level 1)                      |

Blockiert wird über `webNavigation.onBeforeNavigate`: Der Tab wird auf
`showstopper.html?url=<blockierte URL>` umgeleitet. Dafür braucht die Extension
keine Host-Berechtigungen.

## Lizenz

MIT – siehe [LICENSE](LICENSE).
