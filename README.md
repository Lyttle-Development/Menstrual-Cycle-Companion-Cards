# Menstrual Cycle Companion Cards

Optional Lovelace cards for the [Menstrual Cycle Companion](https://github.com/Lyttle-Development/menstrual-cycle-companion) Home Assistant integration.

![Menstrual Cycle Gauge Card preview](images/gauge-card.svg)

![Menstrual Cycle Heatmap Card preview](images/heatmap-card.svg)

## Included cards

- `custom:menstrual-cycle-gauge-card` — monthly circular view with optional calendar editing.
- `custom:menstrual-cycle-heatmap-card` — historical cycle comparison with period and fertile-window markers.

The cards do not store cycle data and cannot work without a configured integration sensor.

## Install with HACS

1. Install and configure **Menstrual Cycle Companion** first.
2. Open **HACS → Frontend**.
3. Search for **Menstrual Cycle Companion Cards** and install it.
4. Restart Home Assistant if HACS requests it.
5. If the resources are not added automatically, go to **Settings → Dashboards → Resources** and add:

   - `/hacsfiles/menstrual-cycle-companion-cards/menstrual-cycle-gauge-card.js` as **JavaScript module**
   - `/hacsfiles/menstrual-cycle-companion-cards/menstrual-cycle-heatmap-card.js` as **JavaScript module**

For an unpublished repository, add this repository to HACS as a custom **Dashboard** repository.

## Gauge card example

```yaml
type: custom:menstrual-cycle-gauge-card
entity: sensor.anna
friendly_name: Anna
title: Cycle gauge
period_duration_days: learnt
show_fertile_period: true
calendar_edit_enabled: true
theme_mode: auto
```

Click **Show editor** or the countdown area to open the month calendar. Clicking a day calls the integration's add/remove service.

## Heatmap example

```yaml
type: custom:menstrual-cycle-heatmap-card
entity: sensor.anna
title: Cycle history
max_cycles: 18
period_duration_days: 5
show_fertile_period: true
cycle_alignment: bottom
```

`cycle_alignment` can be `top` (align from cycle start) or `bottom` (align from cycle end).

## Symptom overlays

The heatmap can display optional date-list attributes from other sensors:

```yaml
symptom_entities:
  - entity: sensor.anna_pms_notes
    name: Symptoms
    icon: mdi:note-heart-outline
```

The referenced sensor should expose a `dates`, `date_list`, or `history` attribute containing ISO dates (`YYYY-MM-DD`).

## Manual installation

Copy both JavaScript files into `/config/www/`, add them as JavaScript-module resources, and clear the browser cache. The integration must still be installed separately.

## License

MIT. See [`LICENSE`](LICENSE).

