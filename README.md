# Menstrual Cycle Companion Cards

Optional Lovelace cards for the [Menstrual Cycle Companion](https://github.com/Lyttle-Development/menstrual-cycle-companion) Home Assistant integration.

![Menstrual Cycle Gauge Card preview](images/gauge-card.svg)

![Menstrual Cycle Heatmap Card preview](images/heatmap-card.svg)

## Included cards

- `custom:menstrual-gauge-card` — monthly circular phase view with optional calendar editing.
- `custom:menstrual-cycle-heatmap-card` — historical cycle comparison with period and fertile-window markers.
- `custom:menstrual-calendar-card` — full calendar and daily symptom view.
- `custom:menstrual-countdown-timer` — period countdown and symptom/product timer.
- `custom:menstrual-cycle-card` — compact cycle overview.
- `custom:menstrual-cycle-compact-status` — compact status display.
- `custom:menstrual-cycle-history-card-row` — history row for dashboard layouts.
- `custom:menstrual-product-inventory-card` — household product inventory.
- `custom:menstrual-statistics-card` — cycle, symptom, and product statistics.

The cards do not store cycle data and cannot work without a configured integration sensor.
The integration can register the resources automatically when installed through HACS;
manual installations should add the JavaScript modules they use.

The gauge's colored outer ring shows the proposed menstruation, follicular,
ovulation, and luteal phases. The calendar editor uses matching colored
underlines for each proposed phase, while confirmed bleeding days remain filled.

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
type: custom:menstrual-gauge-card
entity: sensor.anna
friendly_name: Anna
title: Cycle gauge
period_duration_days: learnt
show_fertile_period: true
show_predicted_cycles: true
num_predicted_cycles: 6
calendar_edit_enabled: true
calendar_selection_mode: range
theme_mode: auto
```

Click **Show editor** or the countdown area to open the month calendar. In the
default `range` mode, click the first day and then the last day of the cycle.
The interval is highlighted while it is being selected and the completed range
is written as inclusive confirmed bleeding days and shown with rounded start/end
caps. Right-click a saved day, or hold it on mobile, to remove its contiguous
confirmed range. Set `calendar_selection_mode: toggle` to use single-day
add/remove behavior.

## Heatmap example

```yaml
type: custom:menstrual-cycle-heatmap-card
entity: sensor.anna
title: Cycle history
max_cycles: 30
period_duration_days: 5
show_fertile_period: true
show_predicted_cycles: true
num_predicted_cycles: 6
cycle_alignment: bottom
```

`cycle_alignment` can be `top` (align from cycle start) or `bottom` (align from cycle end).
The heatmap includes the integration's 12 predicted future cycles by default;
set `max_cycles` to control how many historical and predicted columns are visible.

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

## Publishing

To publish a HACS-detectable release, update `version.json` (`major`, `minor`, or
`patch`) and push the change to `main`. The publishing workflow creates a matching
`v<major>.<minor>.<patch>` GitHub release.

## License

MIT. See [`LICENSE`](LICENSE).

