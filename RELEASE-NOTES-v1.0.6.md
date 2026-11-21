# MYHS Central Card v1.0.6

- Kurze, Loxone-inspirierte Statusanzeigen für 16 Kacheltypen; keine direkte Loxone-Anbindung erforderlich.
- Fenster: Offen / gekippt / geschlossen, inklusive optionaler Composite-Zustände 1–5 aus Home Assistant; Zustand 0 (offline) wird ignoriert.
- Beschattung: oben / unten / teilweise.
- Präsenz: „Keine Präsenz“ und „Präsenz in X Räumen“.
- Heizung & Klima: Singular/Plural angepasst; tatsächliche HVAC-Aktion wird berücksichtigt, falls verfügbar.
- Lüftung: „Luftqualität gut“.
- Anwesenheit: „Alle anwesend“, wenn mehr als eine auswertbare Person anwesend ist.
- Beibehalten: Audio „Alle pausiert“ und Media „Alle Geräte aus“.
- `unknown`/`unavailable` werden ignoriert; fehlende Daten erscheinen neutral.
- Kartenname **MYHS Central Card**, Repository **MYHS-Central-Card**.

**Hinweis:** Loxone bietet individuell definierbare Statustexte. Die Formulierungen sind daran angelehnt und entsprechen nicht zwingend jedem Loxone-System. Die Karte arbeitet mit Home Assistant.
