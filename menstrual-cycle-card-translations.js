export function cardLanguage(hass) {
  const documentLanguage = typeof document !== 'undefined' ? document.documentElement?.lang : '';
  const language = String(hass?.locale?.language || documentLanguage || 'en').toLowerCase();
  if (language.startsWith('nl')) return 'nl';
  if (language.startsWith('de')) return 'de';
  if (language.startsWith('fr')) return 'fr';
  return 'en';
}

export const CARD_TRANSLATIONS = {
  en: {
    days_unit: 'days', days_unknown: '-- days', default_gauge_title: 'Cycle Gauge', default_heatmap_title: 'Cycle Heatmap',
    phase_menstruation: 'Menstruation', phase_follicular: 'Follicular', phase_ovulation: 'Ovulation', phase_luteal: 'Luteal',
    refresh: 'Refresh', start_selected: 'Start selected:', click_end: '— click the end date',
    click_cycle_range: 'Click the first day, then the last day of the cycle.', delete_range: 'Right-click a saved range (or hold it on mobile) to delete it.',
    personalized_one: 'Personalized from 1 previous cycle', personalized_many: 'Personalized from {count} previous cycles',
    typical_variation: 'typical variation ±{days} days', default_estimate: 'Using a default estimate until more cycle history is recorded',
    entity_not_found: 'Entity not found', unknown: 'unknown', too_little_history: 'Not enough history data in',
    cycle_start: 'Start', day: 'Day', end: 'End', days_before_end: 'days before end', symptoms: 'Symptoms', scroll: 'scroll',
    legend_actual_period: 'Actual period', legend_period_window: 'Period window',
    legend_fertile: 'Fertile (high probability, Standard Days/calendar method 8-19)', legend_ovulation: 'Ovulation (high probability around day 14)',
    legend_alignment_bottom: 'Alignment: cycle end (E/-days)', legend_alignment_top: 'Alignment: cycle start (day 1..X)',
    editor_entity: 'Entity', editor_fallback_note: 'HA entity picker unavailable, fallback dropdown active.', editor_sensor_search: 'Search sensor...',
    editor_friendly_name: 'Friendly Name (Gauge)', editor_use_sensor_name: 'From sensor', editor_title: 'Title',
    editor_period_duration: 'Period Duration (number 1-14 or "learnt", empty = sensor value)', editor_period_placeholder: 'e.g. 5 or "learnt"',
    editor_theme: 'Theme', theme_auto: 'auto', theme_light: 'light', theme_dark: 'dark', editor_show_fertile: 'Show fertile period',
    editor_calendar_edit: 'Allow new entries through calendar', editor_calendar_selection: 'Calendar date selection',
    selection_range: 'Start and end date (range)', selection_toggle: 'Single-day add/remove',
  },
  nl: {
    days_unit: 'dagen', days_unknown: '-- dagen', default_gauge_title: 'Cyclusmeter', default_heatmap_title: 'Cyclusheatmap',
    phase_menstruation: 'Menstruatie', phase_follicular: 'Follikelfase', phase_ovulation: 'Ovulatie', phase_luteal: 'Luteale fase',
    refresh: 'Vernieuwen', start_selected: 'Start geselecteerd:', click_end: '— klik op de einddatum',
    click_cycle_range: 'Klik op de eerste dag en daarna op de laatste dag van de cyclus.', delete_range: 'Klik met rechts op een opgeslagen reeks (of houd deze ingedrukt op mobiel) om te verwijderen.',
    personalized_one: 'Gepersonaliseerd op basis van 1 eerdere cyclus', personalized_many: 'Gepersonaliseerd op basis van {count} eerdere cycli',
    typical_variation: 'typische variatie ±{days} dagen', default_estimate: 'Standaardschatting totdat meer cyclusgeschiedenis is geregistreerd',
    entity_not_found: 'Entiteit niet gevonden', unknown: 'onbekend', too_little_history: 'Onvoldoende geschiedenisgegevens in',
    cycle_start: 'Start', day: 'Dag', end: 'Einde', days_before_end: 'dagen voor einde', symptoms: 'Symptomen', scroll: 'scrollen',
    legend_actual_period: 'Werkelijke menstruatie', legend_period_window: 'Menstruatievenster', legend_fertile: 'Vruchtbaar (hoge waarschijnlijkheid, dagenmethode 8-19)', legend_ovulation: 'Ovulatie (hoge waarschijnlijkheid rond dag 14)',
    legend_alignment_bottom: 'Uitlijning: cyclus einde (E/-dagen)', legend_alignment_top: 'Uitlijning: cyclusstart (dag 1..X)',
    editor_entity: 'Entiteit', editor_fallback_note: 'HA-entiteitskiezer niet beschikbaar; keuzelijst actief.', editor_sensor_search: 'Sensor zoeken...', editor_friendly_name: 'Vriendelijke naam (meter)', editor_use_sensor_name: 'Van sensor', editor_title: 'Titel',
    editor_period_duration: 'Menstruatieduur (getal 1-14 of "geleerd", leeg = sensorwaarde)', editor_period_placeholder: 'bijv. 5 of "geleerd"', editor_theme: 'Thema', theme_auto: 'auto', theme_light: 'licht', theme_dark: 'donker', editor_show_fertile: 'Vruchtbare periode tonen', editor_calendar_edit: 'Nieuwe invoer via kalender toestaan', editor_calendar_selection: 'Kalenderdatumselectie', selection_range: 'Start- en einddatum (reeks)', selection_toggle: 'Eén dag toevoegen/verwijderen',
  },
  de: {
    days_unit: 'Tage', days_unknown: '-- Tage', default_gauge_title: 'Zyklus-Tacho', default_heatmap_title: 'Zyklus-Heatmap',
    phase_menstruation: 'Menstruation', phase_follicular: 'Follikelphase', phase_ovulation: 'Ovulation', phase_luteal: 'Lutealphase', refresh: 'Aktualisieren', start_selected: 'Start ausgewählt:', click_end: '— Enddatum anklicken', click_cycle_range: 'Klicke auf den ersten und anschließend auf den letzten Tag des Zyklus.', delete_range: 'Klicke mit der rechten Maustaste auf einen gespeicherten Bereich (oder halte ihn mobil gedrückt), um ihn zu löschen.', personalized_one: 'Personalisiert anhand von 1 vorherigen Zyklus', personalized_many: 'Personalisiert anhand von {count} vorherigen Zyklen', typical_variation: 'typische Abweichung ±{days} Tage', default_estimate: 'Standardprognose, bis mehr Zyklusverlauf aufgezeichnet wurde', entity_not_found: 'Entität nicht gefunden', unknown: 'unbekannt', too_little_history: 'Nicht genügend Verlaufsdaten in', cycle_start: 'Start', day: 'Tag', end: 'Ende', days_before_end: 'Tage vor Ende', symptoms: 'Symptome', scroll: 'scrollen', legend_actual_period: 'Tatsächliche Menstruation', legend_period_window: 'Menstruationszeitraum', legend_fertile: 'Fruchtbar (hohe Wahrscheinlichkeit, Standardtage-/Kalendermethode 8-19)', legend_ovulation: 'Ovulation (hohe Wahrscheinlichkeit um Tag 14)', legend_alignment_bottom: 'Ausrichtung: Zyklusende (E/-Tage)', legend_alignment_top: 'Ausrichtung: Zyklusstart (Tag 1..X)', editor_entity: 'Entität', editor_fallback_note: 'HA-Entitätsauswahl nicht verfügbar; Auswahlliste aktiv.', editor_sensor_search: 'Sensor suchen...', editor_friendly_name: 'Anzeigename (Tacho)', editor_use_sensor_name: 'Vom Sensor', editor_title: 'Titel', editor_period_duration: 'Menstruationsdauer (Zahl 1-14 oder "gelernt", leer = Sensorwert)', editor_period_placeholder: 'z. B. 5 oder "gelernt"', editor_theme: 'Design', theme_auto: 'automatisch', theme_light: 'hell', theme_dark: 'dunkel', editor_show_fertile: 'Fruchtbare Periode anzeigen', editor_calendar_edit: 'Neue Einträge über den Kalender erlauben', editor_calendar_selection: 'Kalenderdatumauswahl', selection_range: 'Start- und Enddatum (Bereich)', selection_toggle: 'Einzelnen Tag hinzufügen/entfernen',
  },
  fr: {
    days_unit: 'jours', days_unknown: '-- jours', default_gauge_title: 'Jauge du cycle', default_heatmap_title: 'Carte thermique du cycle', phase_menstruation: 'Menstruation', phase_follicular: 'Phase folliculaire', phase_ovulation: 'Ovulation', phase_luteal: 'Phase lutéale', refresh: 'Actualiser', start_selected: 'Début sélectionné :', click_end: '— cliquez sur la date de fin', click_cycle_range: 'Cliquez sur le premier jour, puis sur le dernier jour du cycle.', delete_range: 'Faites un clic droit sur une plage enregistrée (ou maintenez-la sur mobile) pour la supprimer.', personalized_one: 'Personnalisé à partir de 1 cycle précédent', personalized_many: 'Personnalisé à partir de {count} cycles précédents', typical_variation: 'variation habituelle de ±{days} jours', default_estimate: 'Estimation par défaut jusqu’à l’enregistrement de plus d’historique', entity_not_found: 'Entité introuvable', unknown: 'inconnu', too_little_history: 'Pas assez de données historiques dans', cycle_start: 'Début', day: 'Jour', end: 'Fin', days_before_end: 'jours avant la fin', symptoms: 'Symptômes', scroll: 'défiler', legend_actual_period: 'Règles réelles', legend_period_window: 'Période des règles', legend_fertile: 'Fertile (probabilité élevée, méthode des jours standards/calendrier 8-19)', legend_ovulation: 'Ovulation (probabilité élevée autour du jour 14)', legend_alignment_bottom: 'Alignement : fin du cycle (F/-jours)', legend_alignment_top: 'Alignement : début du cycle (jour 1..X)', editor_entity: 'Entité', editor_fallback_note: 'Sélecteur d’entité HA indisponible ; liste de secours active.', editor_sensor_search: 'Rechercher un capteur...', editor_friendly_name: 'Nom convivial (jauge)', editor_use_sensor_name: 'Depuis le capteur', editor_title: 'Titre', editor_period_duration: 'Durée des règles (nombre 1-14 ou « apprise », vide = valeur du capteur)', editor_period_placeholder: 'ex. 5 ou « apprise »', editor_theme: 'Thème', theme_auto: 'automatique', theme_light: 'clair', theme_dark: 'sombre', editor_show_fertile: 'Afficher la période fertile', editor_calendar_edit: 'Autoriser les nouvelles entrées via le calendrier', editor_calendar_selection: 'Sélection de date du calendrier', selection_range: 'Dates de début et de fin (plage)', selection_toggle: 'Ajouter/supprimer un jour',
  },
};

export function translateCard(hass, key, values = {}) {
  const language = cardLanguage(hass);
  let text = CARD_TRANSLATIONS[language]?.[key] || CARD_TRANSLATIONS.en[key] || key;
  Object.entries(values).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, String(value)); });
  return text;
}
