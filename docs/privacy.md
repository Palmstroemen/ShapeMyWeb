# Datenschutzerklärung / Privacy Policy – ShapeMyWeb

*Stand / Last updated: 27. Oktober 2026 · [English version below](#english)*

## Deutsch

### Kurz gesagt

ShapeMyWeb sammelt **keine** Daten. Es gibt keinen Server, kein Tracking, keine
Werbung und keine Analyse. Nichts von dem, was du in der Erweiterung einträgst
oder im Web tust, wird an uns geschickt.

### Welche Daten die Erweiterung speichert

Damit ShapeMyWeb funktioniert, speichert die Erweiterung **in deinem Browser**:

- deine Liste vermiedener Webseiten: Domain, gewählte Teilbereiche, deine
  Erinnerungstexte, Störstärken pro Rolle sowie die Alternativen
  (Adresse, Kurztext, Farbe),
- deine Einstellungen (z. B. Pausezeit, angezeigte Rollen),
- die aktive Rolle und ob die Erweiterung gerade pausiert ist,
- für kurze Zeit, welche Seiten du gerade „trotzdem“ besuchen darfst.

Liste und Einstellungen werden mit der Synchronisationsfunktion deines
Browsers (`storage.sync`) gespeichert. Wenn du die Synchronisation in Chrome
bzw. Firefox eingeschaltet hast, gleicht **dein Browserhersteller** (Google
bzw. Mozilla) diese Daten zwischen deinen Geräten ab. Dafür gelten deren
Datenschutzbestimmungen. Ohne Synchronisation bleiben die Daten auf deinem Gerät.

### Wozu die Berechtigungen dienen

| Berechtigung    | Wozu                                                                                   |
|-----------------|----------------------------------------------------------------------------------------|
| `webNavigation` | Erkennen, dass ein Tab eine Seite deiner Liste aufruft, um stattdessen das Stoppschild zu zeigen. Die Prüfung passiert ausschließlich lokal. |
| `tabs`          | Die Adresse des aktuellen Tabs lesen, damit das Menü weiß, welche Seite du vermeiden möchtest; den Tab auf das Stoppschild umleiten. |
| `storage`       | Liste und Einstellungen speichern (siehe oben).                                        |
| `history`       | Das Stoppschild selbst aus dem Browserverlauf entfernen, damit dein Verlauf sauber bleibt. Der Verlauf wird nicht gelesen. |

Die Erweiterung hat keinen Zugriff auf den Inhalt von Webseiten.

### Verbindungen ins Internet

ShapeMyWeb lädt keinen Code nach und schickt keine Daten an uns oder an
Dritte. Die einzigen Verbindungen sind:

- **Icons deiner Alternativen:** Auf dem Stoppschild wird das Symbol
  (`/favicon.ico`) jeder Alternative direkt von der jeweiligen Webseite geladen.
  Diese Webseite sieht dabei – wie bei jedem Aufruf – deine IP-Adresse und
  übliche Browserangaben.
- **Links, die du anklickst:** z. B. Alternativen oder der Kontakt-Link zu GitHub.

### Löschen

Wenn du eine Seite freigibst, wird ihr Erinnerungstext gelöscht. Störstärken
und Alternativen bleiben gespeichert, damit sie beim nächsten Vermeiden wieder
da sind. Deinstallierst du die Erweiterung, löscht der Browser ihre Daten auf
diesem Gerät. Synchronisierte Daten kannst du über die Sync-Einstellungen
deines Browsers entfernen.

### Kontakt

Fragen zum Datenschutz: [GitHub-Issues](https://github.com/Palmstroemen/ShapeMyWeb/issues)
oder an <!-- TODO: Name und E-Mail-Adresse des Verantwortlichen eintragen -->[Name, E-Mail].

Änderungen dieser Erklärung sind in der
[Versionsgeschichte](https://github.com/Palmstroemen/ShapeMyWeb/commits/main/docs/privacy.md)
nachvollziehbar.

---

<a id="english"></a>

## English

### In short

ShapeMyWeb collects **no** data. There is no server, no tracking, no ads and no
analytics. Nothing you enter in the extension or do on the web is sent to us.

### What the extension stores

To work, ShapeMyWeb stores **in your browser**:

- your list of avoided websites: domain, selected sections, your reminder
  texts, avoid levels per role and your alternatives (address, short text, colour),
- your settings (e.g. pause duration, visible roles),
- the active role and whether the extension is currently paused,
- for a short time, which websites you may visit "anyway".

The list and settings are saved using your browser's sync storage
(`storage.sync`). If sync is turned on in Chrome or Firefox, **your browser
vendor** (Google or Mozilla) keeps this data in sync between your devices,
subject to their privacy policies. Without sync, the data stays on your device.

### What the permissions are for

| Permission      | Purpose                                                                                |
|-----------------|----------------------------------------------------------------------------------------|
| `webNavigation` | Notice that a tab is opening a website on your list so the stop sign can be shown instead. The check happens locally only. |
| `tabs`          | Read the current tab's address so the menu knows which website you want to avoid; redirect the tab to the stop sign. |
| `storage`       | Save your list and settings (see above).                                               |
| `history`       | Remove the stop sign page itself from your browsing history. The history is not read. |

The extension has no access to the content of websites.

### Network connections

ShapeMyWeb loads no remote code and sends no data to us or to third parties.
The only connections are:

- **Icons of your alternatives:** on the stop sign, each alternative's icon
  (`/favicon.ico`) is loaded directly from that website. Like any visit, that
  website sees your IP address and standard browser information.
- **Links you click:** e.g. alternatives or the contact link to GitHub.

### Deleting data

When you stop avoiding a website, its reminder text is deleted. Avoid levels
and alternatives are kept so they are back the next time you avoid it.
Uninstalling the extension deletes its data on that device. Synced data can be
removed via your browser's sync settings.

### Contact

Privacy questions: [GitHub issues](https://github.com/Palmstroemen/ShapeMyWeb/issues)
or <!-- TODO: controller name and e-mail -->[name, e-mail].

Changes to this policy are visible in the
[version history](https://github.com/Palmstroemen/ShapeMyWeb/commits/main/docs/privacy.md).
