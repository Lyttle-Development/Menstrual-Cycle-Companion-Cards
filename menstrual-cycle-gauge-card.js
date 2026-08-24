class MenstrualCycleGaugeCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: 'custom:menstrual-cycle-gauge-card',
      entity: 'sensor.menstruation',
      entry_id: '',
      friendly_name: '',
      theme_mode: 'auto',
      title: 'Cycle Companion',
      view_mode: 'gauge',
      show_fertile_period: true,
      calendar_edit_enabled: true,
      calendar_selection_mode: 'range'
    };
  }

  static getConfigElement() {
    return document.createElement('menstrual-cycle-gauge-card-editor');
  }

  setConfig(config) {
    if (!config || (!config.entity && !config.entry_id)) {
      throw new Error('entity or entry_id is required');
    }
    this._config = {
      show_editor: true,
      show_fertile_period: true,
      calendar_edit_enabled: true,
      calendar_selection_mode: 'range',
      ...config
    };
    this._viewDate = new Date();
    const configuredView = String(this._config.view_mode || 'gauge').toLowerCase();
    this._viewMode = ['gauge', 'calendar', 'details'].includes(configuredView) ? configuredView : 'gauge';
    this._selectedDetailsPhase = null;
    this._editorOpen = false;
    this._lastRenderedStateObj = null;
    this._lastRenderedEntityId = null;
    this._lastRenderedTheme = null;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._scheduleRender();
  }

  _scheduleRender() {
    if (this._renderFrame) return;
    const render = () => {
      this._renderFrame = null;
      const entityId = this._resolveEntityId();
      const stateObj = entityId ? this._hass?.states?.[entityId] : undefined;
      const theme = this._resolveThemeMode();
      if (entityId === this._lastRenderedEntityId
        && stateObj === this._lastRenderedStateObj
        && theme === this._lastRenderedTheme) return;
      this._render();
      this._lastRenderedEntityId = entityId;
      this._lastRenderedStateObj = stateObj;
      this._lastRenderedTheme = theme;
    };
    if (typeof requestAnimationFrame === 'function') {
      this._renderFrame = requestAnimationFrame(render);
    } else {
      this._renderFrame = setTimeout(render, 0);
    }
  }

  getCardSize() {
    return 4;
  }

  _ensureRoot() {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: 'open' });
  }

  _lang() {
    return 'en';
  }

  _t(key) {
    const i18n = { days_unit: 'days', days_unknown: '-- days' };
    return i18n[key] || key;
  }

  _normalizeISO(value) {
    const m = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
  }

  _parseISO(iso) {
    const n = this._normalizeISO(iso);
    if (!n) return null;
    const [y, m, d] = n.split('-').map((x) => Number(x));
    const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  _isoFromDate(dt) {
    if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _addDaysISO(iso, days) {
    const date = this._parseISO(iso);
    if (!date) return null;
    date.setDate(date.getDate() + Number(days || 0));
    return this._isoFromDate(date);
  }

  _dayDiff(aIso, bIso) {
    const a = this._parseISO(aIso);
    const b = this._parseISO(bIso);
    if (!a || !b) return 0;
    return Math.round((a.getTime() - b.getTime()) / 86400000);
  }

  _monthDays(dt) {
    return new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  }

  _resolvePeriodDuration(attrs) {
    const sensorEffective = Number(attrs?.period_duration_days);
    const sensorLearned = Number(attrs?.period_duration_learned_avg_days);
    const sensorDefault = Number(attrs?.period_duration_default_days);
    if (Number.isFinite(sensorEffective)) return Math.max(1, Math.min(14, Math.round(sensorEffective)));
    if (Number.isFinite(sensorLearned)) return Math.max(1, Math.min(14, Math.round(sensorLearned)));
    if (Number.isFinite(sensorDefault)) return Math.max(1, Math.min(14, Math.round(sensorDefault)));
    return 5;
  }

  _buildModel() {
    const entityId = this._resolveEntityId();
    const stateObj = entityId ? this._hass?.states?.[entityId] : undefined;
    const attrs = stateObj?.attributes || {};
    const history = Array.isArray(attrs.history) ? attrs.history.map((x) => this._normalizeISO(x)).filter(Boolean) : [];
    const confirmedSet = new Set(history);
    const periodDuration = this._resolvePeriodDuration(attrs);
    const predicted = this._normalizeISO(attrs.next_predicted_start);
    const fertileStart = this._normalizeISO(attrs.fertile_window_start);
    const fertileEnd = this._normalizeISO(attrs.fertile_window_end);
    const phases = {
      menstruation: { start: this._normalizeISO(attrs.menstruation_start), end: this._normalizeISO(attrs.menstruation_end) },
      follicular: { start: this._normalizeISO(attrs.follicular_phase_start), end: this._normalizeISO(attrs.follicular_phase_end) },
      ovulation: { start: this._normalizeISO(attrs.ovulation_date), end: this._normalizeISO(attrs.ovulation_date) },
      luteal: { start: this._normalizeISO(attrs.luteal_phase_start), end: this._normalizeISO(attrs.luteal_phase_end) }
    };
    const groupedStarts = Array.isArray(attrs.grouped_starts)
      ? attrs.grouped_starts.map((x) => this._normalizeISO(x)).filter(Boolean).sort()
      : [];
    const predictedStarts = Array.isArray(attrs.predicted_cycle_starts)
      ? attrs.predicted_cycle_starts.map((x) => this._normalizeISO(x)).filter(Boolean).sort()
      : [];
    const cycleLengthEstimate = Number(attrs.avg_cycle_length);
    const viewDate = this._viewDate || new Date();
    if (predictedStarts.length && Number.isFinite(cycleLengthEstimate) && cycleLengthEstimate > 0) {
      const forecastEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 2, 1, 12);
      let cursor = this._parseISO(predictedStarts[predictedStarts.length - 1]);
      while (cursor && cursor < forecastEnd) {
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + Math.round(cycleLengthEstimate));
        predictedStarts.push(this._isoFromDate(cursor));
      }
    }
    const cycleStarts = Array.from(new Set([...groupedStarts, ...predictedStarts])).sort();
    const phaseRanges = [];
    cycleStarts.forEach((start, index) => {
      const nextStart = cycleStarts[index + 1]
        || (predictedStarts.includes(start) && Number.isFinite(cycleLengthEstimate)
          ? this._addDaysISO(start, Math.round(cycleLengthEstimate))
          : null);
      if (!nextStart) return;
      const cycleEnd = this._addDaysISO(nextStart, -1);
      const periodEnd = this._addDaysISO(start, Math.min(periodDuration - 1, this._dayDiff(cycleEnd, start)));
      const ovulation = this._addDaysISO(nextStart, -14);
      const ovulationDate = this._dayDiff(ovulation, periodEnd) < 0 ? periodEnd : (this._dayDiff(ovulation, cycleEnd) > 0 ? cycleEnd : ovulation);
      phaseRanges.push({
        start,
        end: cycleEnd,
        predicted: predictedStarts.includes(start),
        menstruation: { start, end: periodEnd },
        follicular: { start: this._addDaysISO(periodEnd, 1), end: this._addDaysISO(ovulationDate, -1) },
        ovulation: { start: ovulationDate, end: ovulationDate },
        luteal: { start: this._addDaysISO(ovulationDate, 1), end: cycleEnd }
      });
    });

    const daysInMonth = this._monthDays(viewDate);
    const series = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, 12, 0, 0, 0);
      const iso = this._isoFromDate(dt);
      series.push({
        day,
        iso,
        confirmed: confirmedSet.has(iso),
        fertile: fertileStart && fertileEnd ? (this._dayDiff(iso, fertileStart) >= 0 && this._dayDiff(fertileEnd, iso) >= 0) : false,
        phase: phaseRanges.flatMap((cycle) => Object.entries(cycle).filter(([key]) => ['menstruation', 'follicular', 'ovulation', 'luteal'].includes(key))
          .map(([key, range]) => ({ key, range }))).find(({ range }) => range.start && range.end
            && this._dayDiff(iso, range.start) >= 0 && this._dayDiff(range.end, iso) >= 0)?.key || ''
      });
    }

    return {
      entityId,
      stateObj,
      state: String(stateObj?.state || 'neutral'),
      history,
      confirmedSet,
      predicted,
      periodDuration,
      fertileStart,
      fertileEnd,
      phases,
      phaseRanges,
      groupedStarts,
      predictedStarts,
      averageCycleLength: Number(attrs.avg_cycle_length),
      variability: Number(attrs.cycle_length_variability_days),
      predictionConfidence: Number(attrs.prediction_confidence),
      predictionMethod: String(attrs.prediction_method || ''),
      daysInMonth,
      series,
      todayIso: this._isoFromDate(new Date())
    };
  }

  _resolveEntityId() {
    const states = this._hass?.states || {};
    const configuredEntity = String(this._config?.entity || '').trim();
    if (configuredEntity && states[configuredEntity]) return configuredEntity;

    const targetEntryId = String(this._config?.entry_id || '').trim();
    if (targetEntryId) {
      const match = Object.keys(states).find((entityId) => {
        const st = states[entityId];
        return st?.attributes?.entry_id === targetEntryId;
      });
      if (match) return match;
    }
    return configuredEntity || null;
  }

  _stateBg(state) {
    if (state === 'period') return 'linear-gradient(135deg, rgba(255,245,247,.98), rgba(255,255,255,.98))';
    if (state === 'fertile') return 'linear-gradient(135deg, rgba(255,252,239,.98), rgba(255,255,255,.98))';
    if (state === 'pms') return 'linear-gradient(135deg, rgba(255,247,250,.98), rgba(255,255,255,.98))';
    return 'var(--ha-card-background, var(--card-background-color, #fff))';
  }

  _resolveThemeMode() {
    const mode = String(this._config?.theme_mode || 'auto').toLowerCase();
    if (mode === 'dark' || mode === 'light') return mode;
    return this._hass?.themes?.darkMode ? 'dark' : 'light';
  }

  _palette(state) {
    const dark = this._resolveThemeMode() === 'dark';
    if (!dark) {
      return {
        cardBg: this._stateBg(state),
        cardColor: '#4a044e',
        border: 'rgba(190,24,93,.20)',
        shadow: '0 8px 20px rgba(131,24,67,.10)',
        monthText: 'rgba(131,24,67,.72)',
        dayLabel: 'rgba(131,24,67,.68)',
        tick: 'rgba(190,24,93,.22)',
        confirmed: '#be123c',
        fertile: '#facc15',
        markerStroke: '#ffe4e6',
        hand: '#be123c',
        ring: 'rgba(190,24,93,.16)',
        countdownBg: 'rgba(255,255,255,.44)',
        countdownColor: '#831843',
        buttonBg: '#fff',
        buttonColor: '#831843',
        buttonBorder: 'rgba(190,24,93,.25)',
        dayBg: '#fff',
        dayColor: '#6b1b4a',
        dayBorder: 'rgba(190,24,93,.16)',
        dayToday: 'rgba(190,24,93,.35)',
      };
    }

    const bg = state === 'period'
      ? 'linear-gradient(135deg, rgba(50,35,40,.98), rgba(32,29,32,.98))'
      : state === 'fertile'
        ? 'linear-gradient(135deg, rgba(45,43,32,.98), rgba(31,31,29,.98))'
        : state === 'pms'
          ? 'linear-gradient(135deg, rgba(48,37,43,.98), rgba(31,29,32,.98))'
          : 'var(--ha-card-background, var(--card-background-color, #1c1c1c))';

    return {
      cardBg: bg,
      cardColor: '#f8d9e9',
      border: 'rgba(251,113,133,.34)',
      shadow: '0 10px 24px rgba(0,0,0,.34)',
      monthText: 'rgba(251,214,232,.82)',
      dayLabel: 'rgba(251,214,232,.78)',
      tick: 'rgba(251,113,133,.42)',
      confirmed: '#fb7185',
      fertile: '#fde047',
      markerStroke: '#2f1f29',
      hand: '#fb7185',
      ring: 'rgba(251,113,133,.32)',
      countdownBg: 'rgba(32,20,29,.72)',
      countdownColor: '#ffd4e6',
      buttonBg: 'rgba(41,27,36,.95)',
      buttonColor: '#ffd4e6',
      buttonBorder: 'rgba(251,113,133,.45)',
      dayBg: 'rgba(41,27,36,.95)',
      dayColor: '#f9d8e9',
      dayBorder: 'rgba(251,113,133,.30)',
      dayToday: 'rgba(251,113,133,.66)',
    };
  }

  _polar(cx, cy, r, deg) {
    const a = deg * Math.PI / 180;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  }

  _arcPath(cx, cy, r, startDeg, endDeg) {
    const s = this._polar(cx, cy, r, startDeg);
    const e = this._polar(cx, cy, r, endDeg);
    const span = ((endDeg - startDeg) % 360 + 360) % 360;
    const largeArc = span > 180 ? 1 : 0;
    return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArc} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
  }

  _confirmedRanges(series) {
    const days = (series || []).filter((step) => step.confirmed).map((step) => step.day).sort((a, b) => a - b);
    if (!days.length) return [];
    const ranges = [];
    let start = days[0];
    let prev = days[0];
    for (let i = 1; i < days.length; i += 1) {
      const day = days[i];
      if (day === prev + 1) {
        prev = day;
        continue;
      }
      ranges.push({ start, end: prev });
      start = day;
      prev = day;
    }
    ranges.push({ start, end: prev });
    return ranges;
  }

  _renderGauge(model, palette) {
    const cx = 210;
    const cy = 210;
    const rInner = 126;
    const baseTick = 4.2;
    const extraBar = 26;
    const total = model.daysInMonth || 30;
    const safePeriodDuration = Number.isFinite(Number(model.periodDuration))
      ? Math.max(1, Math.min(14, Math.round(Number(model.periodDuration))))
      : 5;
    const gaugeWidth = Number(this._lastCardWidth || 0);
    let labelStep = 1;
    if (gaugeWidth > 0 && gaugeWidth < 320) labelStep = 5;
    else if (gaugeWidth > 0 && gaugeWidth < 380) labelStep = 3;
    else if (gaugeWidth > 0 && gaugeWidth < 480) labelStep = 2;
    const now = new Date();
    const dayNow = now.getDate();
    const handAngle = -90 + ((((dayNow - 1) + now.getHours() / 24) / total) * 360);
    const isCurrentViewMonth = this._viewDate.getMonth() === now.getMonth()
      && this._viewDate.getFullYear() === now.getFullYear();

    const baseTicks = model.series.map((_, i) => {
      const angle = -90 + ((i / total) * 360);
      return `<g transform="translate(${cx} ${cy}) rotate(${angle})"><rect x="-1.3" y="-${(rInner + baseTick).toFixed(1)}" width="2.6" height="${baseTick.toFixed(1)}" rx="1.2" fill="${palette.tick}"></rect></g>`;
    }).join('');

    const dayLabels = model.series.map((step, i) => {
      const isFirst = step.day === 1;
      const isLast = step.day === total;
      if (!isFirst && !isLast && (step.day % labelStep !== 0)) return '';
      const angle = -90 + ((((i + 0.5) / total) * 360));
      const pos = this._polar(cx, cy, 178, angle);
      return `<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" fill="${palette.dayLabel}" font-size="10" text-anchor="middle" dominant-baseline="middle">${step.day}</text>`;
    }).join('');

    const confirmedRanges = this._confirmedRanges(model.series);

    const currentMonthPeriodWindowBars = isCurrentViewMonth
      ? confirmedRanges.map((range) => {
        const windowEnd = Math.min(total, range.start + safePeriodDuration - 1);
        const startAngle = -90 + ((((range.start - 1) + 0.08) / total) * 360);
        const endAngle = -90 + ((((windowEnd) - 0.08) / total) * 360);
        const dPath = this._arcPath(cx, cy, rInner + extraBar * 0.74, startAngle, endAngle);
        return `<path d="${dPath}" fill="none" stroke="${palette.confirmed}" stroke-width="9" stroke-linecap="round" stroke-opacity="0.24"></path>`;
      }).join('')
      : '';

    const confirmedBars = confirmedRanges.map((range) => {
      const startAngle = -90 + ((((range.start - 1) + 0.08) / total) * 360);
      const endAngle = -90 + ((((range.end) - 0.08) / total) * 360);
      const dPath = this._arcPath(cx, cy, rInner + extraBar * 0.74, startAngle, endAngle);
      return `<path d="${dPath}" fill="none" stroke="${palette.confirmed}" stroke-width="9" stroke-linecap="round" stroke-opacity="0.78"></path>`;
    }).join('');

    const showFertile = this._config?.show_fertile_period !== false;
    const fertileBars = model.series.map((step) => {
      if (!showFertile) return '';
      if (!step.fertile) return '';
      const day = step.day;
      const startAngle = -90 + ((((day - 1) + 0.08) / total) * 360);
      const endAngle = -90 + ((((day - 0.08) / total) * 360));
      const dPath = this._arcPath(cx, cy, rInner + extraBar * 0.46, startAngle, endAngle);
      return `<path d="${dPath}" fill="none" stroke="${palette.fertile}" stroke-width="6" stroke-linecap="round" stroke-opacity=".62"></path>`;
    }).join('');

    const phaseColors = {
      menstruation: palette.confirmed,
      follicular: '#f59e0b',
      ovulation: '#60a5fa',
      luteal: '#1e3a8a'
    };
    const monthStart = new Date(this._viewDate.getFullYear(), this._viewDate.getMonth(), 1, 12);
    const monthEnd = new Date(this._viewDate.getFullYear(), this._viewDate.getMonth(), total, 12);
    const phaseBars = (model.phaseRanges || []).flatMap((cycle) => Object.entries(cycle)
      .filter(([name]) => phaseColors[name])
      .map(([name, phase]) => {
        const startDt = this._parseISO(phase.start);
        const endDt = this._parseISO(phase.end);
        if (!startDt || !endDt) return '';
        const visibleStart = new Date(Math.max(startDt.getTime(), monthStart.getTime()));
        const visibleEnd = new Date(Math.min(endDt.getTime(), monthEnd.getTime()));
        if (visibleStart > visibleEnd) return '';
        const startDay = visibleStart.getDate();
        const endDay = visibleEnd.getDate();
        const startAngle = -90 + ((((startDay - 1) + 0.06) / total) * 360);
        const endAngle = -90 + ((((endDay) - 0.06) / total) * 360);
        const dPath = this._arcPath(cx, cy, rInner + extraBar + 13, startAngle, endAngle);
        const opacity = cycle.predicted ? '.42' : '.82';
        return `<path d="${dPath}" fill="none" stroke="${phaseColors[name]}" stroke-width="7" stroke-linecap="butt" stroke-opacity="${opacity}"></path>`;
      })).join('');

    let predictedMarker = '';
    let predictedBars = '';
    const predictedDt = this._parseISO(model.predicted);
    const showPredictedInView = predictedDt
      && predictedDt.getFullYear() === this._viewDate.getFullYear()
      && predictedDt.getMonth() === this._viewDate.getMonth();
    if (showPredictedInView) {
      const pDay = predictedDt.getDate();
      const marker = (offset, fill, radius) => {
        const d = pDay + offset;
        if (d < 1 || d > total) return '';
        const angle = -90 + ((((d - 1) + 0.5) / total) * 360);
        const pos = this._polar(cx, cy, rInner + extraBar + 3, angle);
        return `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="${radius}" fill="${fill}" stroke="${palette.markerStroke}" stroke-width="2"></circle>`;
      };
      predictedMarker = `${marker(-1, '#fb7185', '4.6')}${marker(0, palette.confirmed, '5.5')}${marker(1, '#fb7185', '4.6')}`;

      predictedBars = Array.from({ length: safePeriodDuration }).map((_, idx) => {
        const dt = new Date(predictedDt);
        dt.setDate(dt.getDate() + idx);
        if (dt.getMonth() !== this._viewDate.getMonth() || dt.getFullYear() !== this._viewDate.getFullYear()) return '';
        const day = dt.getDate();
        const startAngle = -90 + ((((day - 1) + 0.06) / total) * 360);
        const endAngle = -90 + ((((day - 0.06) / total) * 360));
        const dPath = this._arcPath(cx, cy, rInner + extraBar * 0.74, startAngle, endAngle);
        const alpha = idx === 0 ? 0.60 : 0.38;
        const sw = idx === 0 ? 8.6 : 7.2;
        return `<path d="${dPath}" fill="none" stroke="${palette.confirmed}" stroke-width="${sw}" stroke-linecap="round" stroke-opacity="${alpha}"></path>`;
      }).join('');
    }

      const handA = this._polar(cx, cy, rInner - 2, handAngle);
    const handB = this._polar(cx, cy, rInner + extraBar - 2, handAngle);
    const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(this._viewDate);

    return `
      <svg class="gauge" viewBox="0 0 420 420" role="img" aria-label="Menstrual Cycle gauge">
        <text x="${cx}" y="44" class="month">${monthLabel}</text>
        ${dayLabels}
        ${baseTicks}
        ${fertileBars}
        ${phaseBars}
        ${currentMonthPeriodWindowBars}
        ${confirmedBars}
        ${predictedBars}
        ${predictedMarker}
        ${isCurrentViewMonth ? `<line x1="${handA.x.toFixed(1)}" y1="${handA.y.toFixed(1)}" x2="${handB.x.toFixed(1)}" y2="${handB.y.toFixed(1)}" stroke="${palette.hand}" stroke-width="1.9" stroke-linecap="round"></line>` : ''}
        <circle cx="${cx}" cy="${cy}" r="106" fill="none" stroke="${palette.ring}" stroke-width="1"></circle>
      </svg>
    `;
  }

  _renderCycleOverview(model) {
    const starts = model.groupedStarts || [];
    const lastStart = starts[starts.length - 1] || '';
    const viewIso = this._isoFromDate(this._viewDate || new Date());
    const selectedCycle = (model.phaseRanges || []).find((cycle) => cycle.start && cycle.end
      && this._dayDiff(viewIso, cycle.start) >= 0 && this._dayDiff(cycle.end, viewIso) >= 0);
    const now = new Date();
    const isCurrentViewMonth = this._viewDate.getFullYear() === now.getFullYear()
      && this._viewDate.getMonth() === now.getMonth();
    const cycleAnchor = selectedCycle?.start || (isCurrentViewMonth ? lastStart : '');
    const cycleDay = cycleAnchor ? Math.max(1, this._dayDiff(viewIso, cycleAnchor) + 1) : null;
    const average = Number.isFinite(model.averageCycleLength) ? Math.round(model.averageCycleLength) : null;
    const variability = Number.isFinite(model.variability) ? Math.round(model.variability) : null;
    const confidence = Number.isFinite(model.predictionConfidence) ? Math.round(model.predictionConfidence * 100) : null;
    const next = model.predicted || (model.predictedStarts || [])[0] || '';
    const previous = starts.length > 1 ? starts[starts.length - 2] : '';
    const dateLabel = (iso, options = { month: 'short', day: 'numeric' }) => {
      const date = this._parseISO(iso);
      return date ? new Intl.DateTimeFormat('en-US', options).format(date) : '--';
    };
    const phaseDefinitions = [
      ['menstruation', 'Period', '#fb7185'],
      ['follicular', 'Follicular', '#f59e0b'],
      ['ovulation', 'Ovulation', '#60a5fa'],
      ['luteal', 'Luteal', '#1e3a8a']
    ];
    const selectedKey = phaseDefinitions.some(([key]) => key === this._selectedDetailsPhase)
      ? this._selectedDetailsPhase
      : (model.state === 'period' ? 'menstruation' : model.state);
    const selectedDefinition = phaseDefinitions.find(([key]) => key === selectedKey) || phaseDefinitions[0];
    const selectedPhase = selectedCycle?.[selectedDefinition[0]]
      || (isCurrentViewMonth ? model.phases[selectedDefinition[0]] : {});
    const phaseDuration = selectedPhase.start && selectedPhase.end
      ? this._dayDiff(selectedPhase.end, selectedPhase.start) + 1
      : null;
    const phaseIsCurrent = selectedPhase.start && selectedPhase.end
      && this._dayDiff(viewIso, selectedPhase.start) >= 0
      && this._dayDiff(selectedPhase.end, viewIso) >= 0;
    const phaseIsPredicted = Boolean(selectedCycle?.predicted);
    const phaseItems = phaseDefinitions.map(([key, label, color]) => {
      const isSelected = key === selectedDefinition[0];
      return `<button type="button" class="phase-tab ${isSelected ? 'active' : ''}" data-details-phase="${key}" aria-pressed="${isSelected}"><span class="phase-dot" style="background:${color}"></span>${label}</button>`;
    }).join('');
    return `
      <section class="overview details-overview" aria-label="Cycle details">
        <div class="overview-main">
          <div class="eyebrow">Cycle progress</div>
          <div class="phase-tabs" role="tablist" aria-label="Cycle phase">${phaseItems}</div>
          <div class="phase-detail">
            <div class="phase-detail-title"><span class="phase-dot" style="background:${selectedDefinition[2]}"></span><strong>${selectedDefinition[1]}</strong>${phaseIsPredicted ? '<span class="phase-badge">Expected</span>' : phaseIsCurrent ? '<span class="phase-badge">Current</span>' : ''}</div>
            <div class="phase-detail-range">${selectedPhase.start ? `${dateLabel(selectedPhase.start, { month: 'short', day: 'numeric', year: 'numeric' })} – ${dateLabel(selectedPhase.end, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No calculated dates for this phase'}</div>
          </div>
          <div class="phase-stat-grid">
            <div class="stat"><span class="stat-label">Duration</span><strong>${phaseDuration ? `${phaseDuration} days` : '--'}</strong></div>
            <div class="stat"><span class="stat-label">Cycle day</span><strong>${cycleDay || '--'}</strong></div>
            <div class="stat"><span class="stat-label">Cycle length</span><strong>${average ? `${average} days` : '--'}</strong></div>
            <div class="stat"><span class="stat-label">Cycle type</span><strong>${phaseIsPredicted ? 'Forecast' : selectedCycle ? 'Recorded' : '--'}</strong></div>
          </div>
        </div>
        <div class="overview-stats">
          <div class="stat"><span class="stat-label">Next guess</span><strong>${dateLabel(next)}</strong><small>${next ? 'predicted start' : 'not enough data'}</small></div>
          <div class="stat"><span class="stat-label">Last start</span><strong>${dateLabel(lastStart)}</strong><small>${previous ? `previous · ${dateLabel(previous)}` : 'recorded history'}</small></div>
        </div>
      </section>
      <section class="stats-row" aria-label="Cycle statistics">
        <div class="stat-pill"><strong>${average || '--'}</strong><span>avg days</span></div>
        <div class="stat-pill"><strong>${variability !== null ? `±${variability}` : '--'}</strong><span>variation</span></div>
        <div class="stat-pill"><strong>${confidence !== null ? `${confidence}%` : '--'}</strong><span>confidence</span></div>
        <div class="stat-pill"><strong>${starts.length || '--'}</strong><span>recorded cycles</span></div>
      </section>
      <div class="prediction-strip"><span class="prediction-dot"></span><span><strong>Forecast</strong> ${model.predictedStarts?.length ? `${model.predictedStarts.length} upcoming guesses` : 'will appear as more history is recorded'}${model.predictionMethod ? ` · ${model.predictionMethod}` : ''}</span></div>
    `;
  }

  _calendarGrid(model, locale) {
    const y = this._viewDate.getFullYear();
    const m = this._viewDate.getMonth();
    const first = new Date(y, m, 1, 12, 0, 0, 0);
    const count = new Date(y, m + 1, 0).getDate();
    const firstDowMon0 = (first.getDay() + 6) % 7;
    const totalCells = Math.ceil((firstDowMon0 + count) / 7) * 7;
    const dows = this._weekdayLabels(locale || this._hass?.locale?.language || 'de');

    const items = [];
    dows.forEach((d) => items.push(`<div class="dow">${d}</div>`));

    for (let i = 0; i < totalCells; i++) {
      const day = i - firstDowMon0 + 1;
      const valid = day >= 1 && day <= count;
      if (!valid) {
        items.push('<button class="day other" type="button" disabled></button>');
        continue;
      }
      const iso = this._isoFromDate(new Date(y, m, day, 12, 0, 0, 0));
      const active = model.confirmedSet.has(iso);
      const predicted = (model.predictedStarts || []).includes(iso) || iso === model.predicted;
      const today = iso === model.todayIso;
      const previousIso = this._isoFromDate(new Date(y, m, day - 1, 12, 0, 0, 0));
      const nextIso = this._isoFromDate(new Date(y, m, day + 1, 12, 0, 0, 0));
      const pendingStart = this._rangeStart || '';
      const pendingEnd = this._rangeEnd || pendingStart;
      const pendingMin = [pendingStart, pendingEnd].sort()[0];
      const pendingMax = [pendingStart, pendingEnd].sort()[1];
      const inPendingRange = pendingStart && pendingEnd
        && iso >= pendingMin && iso <= pendingMax;
      const phase = model.series.find((step) => step.iso === iso)?.phase || '';
      const rangeStart = active && !model.confirmedSet.has(previousIso);
      const rangeEnd = active && !model.confirmedSet.has(nextIso);
      items.push(`<button class="day ${active ? 'active' : ''} ${predicted ? 'predicted' : ''} ${phase ? `phase-${phase}` : ''} ${rangeStart ? 'range-start' : ''} ${rangeEnd ? 'range-end' : ''} ${inPendingRange ? 'pending-range' : ''} ${today ? 'today' : ''}" type="button" data-iso="${iso}">${day}${predicted ? '<span class="forecast-mark" aria-label="Predicted start">•</span>' : ''}</button>`);
    }
    return items.join('');
  }

  _weekdayLabels(locale) {
    const monday = new Date(Date.UTC(2026, 0, 5)); // Monday
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const label = formatter.format(d).replace('.', '').trim();
      return label.charAt(0).toUpperCase() + label.slice(1);
    });
  }

  async _toggleCycleStart(iso) {
    if (this._config?.calendar_edit_enabled === false) return;
    const model = this._buildModel();
    const service = model.confirmedSet.has(iso) ? 'remove_cycle_start' : 'add_cycle_start';
    const profile = model.stateObj?.attributes?.profile;
    const entityId = model.entityId || this._config?.entity || '';
    const entryId = model.stateObj?.attributes?.entry_id || this._config?.entry_id || '';
    const attempts = [];
    attempts.push({ date: iso, ...(entityId ? { entity_id: entityId } : {}), ...(profile ? { profile } : {}), ...(entryId ? { entry_id: entryId } : {}) });
    attempts.push({ date: iso, ...(entityId ? { entity_id: entityId } : {}), ...(profile ? { profile } : {}) });
    attempts.push({ date: iso, ...(profile ? { profile } : {}), ...(entryId ? { entry_id: entryId } : {}) });
    attempts.push({ date: iso, ...(profile ? { profile } : {}) });
    attempts.push({ date: iso });

    let lastError = null;
    for (const payload of attempts) {
      try {
          await this._hass.callService('menstrual_cycle_companion', service, payload);
        return;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Service call failed');
  }

  _confirmedRangeForDate(iso, model = this._buildModel()) {
    if (!model.confirmedSet.has(iso)) return [];
    const dates = [];
    const addDate = (dateIso) => {
      if (model.confirmedSet.has(dateIso)) dates.push(dateIso);
    };
    const adjacent = (dateIso, offset) => {
      const date = this._parseISO(dateIso);
      if (!date) return '';
      date.setDate(date.getDate() + offset);
      return this._isoFromDate(date);
    };

    const before = [];
    let cursor = adjacent(iso, -1);
    while (model.confirmedSet.has(cursor)) {
      before.unshift(cursor);
      cursor = adjacent(cursor, -1);
    }
    before.forEach(addDate);
    addDate(iso);
    cursor = adjacent(iso, 1);
    while (model.confirmedSet.has(cursor)) {
      addDate(cursor);
      cursor = adjacent(cursor, 1);
    }
    return dates;
  }

  async _deleteCalendarSelection(iso) {
    if (this._config?.calendar_edit_enabled === false || !iso || this._toggleInFlight) return;
    if (this._rangeStart && !this._rangeEnd) {
      this._rangeStart = '';
      this._rangeEnd = '';
      this._render();
      return;
    }

    const model = this._buildModel();
    const range = this._confirmedRangeForDate(iso, model);
    if (!range.length) return;

    this._toggleInFlight = true;
    try {
      for (const dateIso of range) await this._toggleCycleStart(dateIso);
      await this._refreshSensorEntity(model.entityId);
      this._render();
    } catch (err) {
      // Keep a visible trace in browser console when backend rejects the delete.
      // eslint-disable-next-line no-console
      console.error('menstrual-cycle-gauge-card: failed to delete calendar range', err);
    } finally {
      this._toggleInFlight = false;
    }
  }

  async _setCycleRange(startIso, endIso) {
    const model = this._buildModel();
    const profile = model.stateObj?.attributes?.profile;
    const entityId = model.entityId || this._config?.entity || '';
    const entryId = model.stateObj?.attributes?.entry_id || this._config?.entry_id || '';
    const base = {
      start_date: startIso,
      end_date: endIso,
      ...(entityId ? { entity_id: entityId } : {}),
      ...(profile ? { profile } : {}),
      ...(entryId ? { entry_id: entryId } : {})
    };
    const attempts = [base, { ...base, entry_id: undefined }, { start_date: startIso, end_date: endIso, ...(profile ? { profile } : {}) }, { start_date: startIso, end_date: endIso }];
    let lastError = null;
    for (const payload of attempts) {
      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
      try {
        await this._hass.callService('menstrual_cycle_companion', 'set_cycle_range', payload);
        return;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Range service call failed');
  }

  async _refreshSensorEntity(entityId) {
    const eid = String(entityId || '').trim();
    if (!eid) return;
    try {
      await this._hass.callService('homeassistant', 'update_entity', { entity_id: eid });
    } catch (_) {
      // Some Home Assistant installations update the entity automatically.
    }
  }

  _attachHandlers() {
    this.shadowRoot.querySelectorAll('[data-view-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        const requestedMode = button.getAttribute('data-view-mode');
        this._viewMode = ['gauge', 'calendar', 'details'].includes(requestedMode) ? requestedMode : 'gauge';
        this._render();
      });
    });
    this.shadowRoot.querySelectorAll('[data-details-phase]').forEach((button) => {
      button.addEventListener('click', () => {
        this._selectedDetailsPhase = button.getAttribute('data-details-phase');
        this._render();
      });
    });
    this.shadowRoot.querySelector('[data-nav="prev"]')?.addEventListener('click', () => {
      this._viewDate = new Date(this._viewDate.getFullYear(), this._viewDate.getMonth() - 1, 1);
      this._render();
    });
    this.shadowRoot.querySelector('[data-nav="next"]')?.addEventListener('click', () => {
      this._viewDate = new Date(this._viewDate.getFullYear(), this._viewDate.getMonth() + 1, 1);
      this._render();
    });
    this.shadowRoot.querySelector('[data-nav="today"]')?.addEventListener('click', () => {
      const now = new Date();
      this._viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
      this._render();
    });
    if (this._config?.calendar_edit_enabled !== false) {
      this.shadowRoot.querySelector('[data-action="toggle-editor"]')?.addEventListener('click', () => {
        this._editorOpen = !this._editorOpen;
        this._render();
      });
    }

    if (this._config?.calendar_edit_enabled !== false) {
      const grid = this.shadowRoot.querySelector('.grid');
      grid?.addEventListener('contextmenu', async (ev) => {
        const btn = ev.target?.closest?.('.day[data-iso]');
        if (!btn) return;
        ev.preventDefault();
        if (this._longPressHandledAt && Date.now() - this._longPressHandledAt < 1500) {
          this._longPressHandledAt = 0;
          return;
        }
        this._suppressCalendarClick = true;
        clearTimeout(this._calendarClickSuppressionTimer);
        this._calendarClickSuppressionTimer = setTimeout(() => {
          this._suppressCalendarClick = false;
        }, 1000);
        await this._deleteCalendarSelection(btn.getAttribute('data-iso'));
      });
      grid?.addEventListener('pointerdown', (ev) => {
        if (ev.pointerType !== 'touch' || ev.button !== 0) return;
        const btn = ev.target?.closest?.('.day[data-iso]');
        if (!btn) return;
        clearTimeout(this._calendarLongPressTimer);
        this._calendarLongPressTimer = setTimeout(async () => {
          this._calendarLongPressTimer = null;
          this._longPressHandledAt = Date.now();
          this._suppressCalendarClick = true;
          clearTimeout(this._calendarClickSuppressionTimer);
          this._calendarClickSuppressionTimer = setTimeout(() => {
            this._suppressCalendarClick = false;
          }, 1000);
          await this._deleteCalendarSelection(btn.getAttribute('data-iso'));
        }, 550);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => {
        grid?.addEventListener(eventName, () => {
          clearTimeout(this._calendarLongPressTimer);
          this._calendarLongPressTimer = null;
        });
      });
      grid?.addEventListener('click', async (ev) => {
        if (this._suppressCalendarClick) {
          this._suppressCalendarClick = false;
          return;
        }
        const btn = ev.target?.closest?.('.day[data-iso]');
        if (!btn) return;
        const iso = btn.getAttribute('data-iso');
        if (!iso || this._toggleInFlight) return;
        this._toggleInFlight = true;
        try {
          const rangeMode = String(this._config?.calendar_selection_mode || 'range').toLowerCase() === 'range';
          if (rangeMode) {
            if (!this._rangeStart || this._rangeEnd) {
              this._rangeStart = iso;
              this._rangeEnd = '';
              this._render();
              return;
            }
            this._rangeEnd = iso;
            const start = [this._rangeStart, this._rangeEnd].sort()[0];
            const end = [this._rangeStart, this._rangeEnd].sort()[1];
            await this._setCycleRange(start, end);
            this._rangeStart = '';
            this._rangeEnd = '';
          } else {
            await this._toggleCycleStart(iso);
          }
          await this._refreshSensorEntity(this._buildModel().entityId);
          this._render();
        } catch (err) {
          // Keep a visible trace in browser console when backend rejects the write.
          // This avoids silent failures in the editor calendar.
          // eslint-disable-next-line no-console
          console.error('menstrual-cycle-gauge-card: failed to toggle cycle day', err);
        } finally {
          this._toggleInFlight = false;
        }
      });
    }
  }

  _render() {
    this._ensureRoot();
    if (!this._config || !this._hass) return;

    const model = this._buildModel();
    const palette = this._palette(model.state);
    const locale = 'en-US';
    const monthYear = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(this._viewDate);
    const cardTitle = String(this._config.title || '').trim();
    const friendlyName = String(this._config.friendly_name || model.stateObj?.attributes?.friendly_name || '').trim();
    const canEdit = this._config?.calendar_edit_enabled !== false;
    const configuredView = String(this._config.view_mode || 'gauge').toLowerCase();
    const viewMode = this._viewMode || (['gauge', 'calendar', 'details'].includes(configuredView) ? configuredView : 'gauge');
    const daysUntil = Number(model.stateObj?.attributes?.days_until_next_start);
    const countdown = Number.isFinite(daysUntil) ? `${daysUntil} days` : '-- days';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          display: block;
          padding: 18px;
          overflow: hidden;
          border: 1px solid var(--ha-card-border-color, var(--divider-color));
          border-radius: 16px;
          background: ${palette.cardBg};
          color: var(--primary-text-color);
          box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, .08));
        }
        .wrap { display: grid; gap: 16px; }
        .head { display: grid; gap: 3px; padding: 1px 2px 0; }
        .card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .friendly { font-size: .78rem; font-weight: 500; color: var(--secondary-text-color); text-align: left; }
        .title-label { font-size: .95rem; font-weight: 700; color: var(--primary-text-color); text-align: left; }
        .gauge-wrap { position: relative; max-width: 420px; width: 100%; aspect-ratio: 1/1; margin: -4px auto 0; }
        .gauge-wrap, .overview, .editor { animation: view-fade 180ms ease both; }
        @keyframes view-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .gauge { width: 100%; height: 100%; display: block; }
        .month { font-size: 12px; fill: ${palette.monthText}; font-weight: 700; letter-spacing: .02em; text-anchor: middle; dominant-baseline: middle; }
        .center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
        .countdown { pointer-events: none; border: 0; border-radius: 10px; padding: 9px 14px; background: var(--primary-color); font: inherit; font-size: 1.05rem; font-weight: 700; color: var(--text-primary-color, #fff); box-shadow: 0 2px 6px rgba(0, 0, 0, .14); }
        .overview { display: grid; grid-template-columns: minmax(0, 1fr) minmax(150px, .7fr); gap: 14px; padding: 18px; border-radius: 14px; background: color-mix(in srgb, var(--primary-color) 7%, transparent); }
        .overview-main { min-width: 0; }
        .overview, .overview * { user-select: text; -webkit-user-select: text; }
        .phase-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 12px 0; }
        .phase-tab { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-width: 0; padding: 8px 6px; border: 1px solid transparent; border-radius: 9px; background: color-mix(in srgb, var(--primary-text-color) 5%, transparent); color: var(--secondary-text-color); font: inherit; font-size: .7rem; cursor: pointer; }
        .phase-tab.active { border-color: color-mix(in srgb, var(--primary-color) 40%, transparent); background: color-mix(in srgb, var(--primary-color) 14%, transparent); color: var(--primary-text-color); font-weight: 600; }
        .phase-detail { display: grid; gap: 5px; padding: 14px; border-radius: 11px; background: color-mix(in srgb, var(--primary-text-color) 6%, transparent); }
        .phase-detail-title { display: flex; align-items: center; gap: 7px; font-size: 1rem; }
        .phase-detail-range { color: var(--secondary-text-color); font-size: .78rem; }
        .phase-badge { margin-left: auto; color: var(--primary-color); font-size: .64rem; text-transform: uppercase; }
        .phase-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
        .eyebrow, .stat-label { color: var(--secondary-text-color); font-size: .7rem; letter-spacing: .06em; text-transform: uppercase; }
        .phase-list { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 18px; }
        .phase-item { display: inline-flex; align-items: center; gap: 5px; padding: 6px 8px; border: 1px solid transparent; border-radius: 999px; color: var(--secondary-text-color); font-size: .72rem; }
        .phase-item.is-current { border-color: color-mix(in srgb, var(--primary-color) 35%, transparent); background: color-mix(in srgb, var(--primary-color) 12%, transparent); color: var(--primary-text-color); }
        .phase-item strong { margin-left: 2px; color: var(--primary-color); font-size: .62rem; text-transform: uppercase; }
        .cycle-position { margin-top: 4px; color: var(--secondary-text-color); font-size: .82rem; }
        .cycle-track { position: relative; height: 10px; margin: 24px 7px 7px; border-radius: 999px; background: color-mix(in srgb, var(--primary-text-color) 12%, transparent); }
        .cycle-fill { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #fb7185, #f59e0b, #60a5fa); }
        .cycle-marker { position: absolute; top: 50%; width: 16px; height: 16px; border: 3px solid var(--ha-card-background, var(--card-background-color)); border-radius: 50%; background: var(--primary-color); transform: translate(-50%, -50%); box-shadow: 0 1px 4px rgba(0,0,0,.18); }
        .track-labels { display: flex; justify-content: space-between; color: var(--secondary-text-color); font-size: .66rem; }
        .track-labels span:nth-child(2) { text-align: center; }
        .overview-stats { display: grid; gap: 8px; align-content: center; }
        .stat { display: grid; gap: 2px; padding: 10px 12px; border-radius: 10px; background: color-mix(in srgb, var(--primary-text-color) 6%, transparent); }
        .stat strong { font-size: 1rem; }
        .stat small { color: var(--secondary-text-color); font-size: .68rem; }
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .stat-pill { display: grid; gap: 2px; padding: 10px 8px; border: 1px solid color-mix(in srgb, var(--primary-text-color) 10%, transparent); border-radius: 10px; text-align: center; }
        .stat-pill strong { font-size: 1.05rem; }
        .stat-pill span { color: var(--secondary-text-color); font-size: .66rem; }
        .prediction-strip { display: flex; align-items: center; gap: 8px; color: var(--secondary-text-color); font-size: .72rem; }
        .prediction-dot { width: 8px; height: 8px; flex: 0 0 auto; border-radius: 50%; background: #60a5fa; box-shadow: 0 0 0 4px color-mix(in srgb, #60a5fa 16%, transparent); }
        .view-switch { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; padding: 3px; border-radius: 11px; background: color-mix(in srgb, var(--primary-text-color) 7%, transparent); }
        .view-switch button { border: 0; border-radius: 8px; padding: 8px 10px; background: transparent; color: var(--secondary-text-color); font: inherit; font-size: .74rem; cursor: pointer; transition: color 160ms ease, background 160ms ease, box-shadow 160ms ease; }
        .view-switch button.active { background: var(--primary-color); color: var(--text-primary-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,.14); }
        .toolbar { display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding-top: 2px; }
        .month-control { display: grid; justify-items: end; gap: 5px; }
        .title { font-weight: 700; color: var(--primary-text-color); }
        .nav { display: inline-flex; gap: 6px; }
        .btn { border: 1px solid var(--divider-color); border-radius: 10px; background: color-mix(in srgb, var(--primary-text-color) 5%, transparent); color: var(--primary-text-color); padding: 8px 12px; cursor: pointer; font: inherit; transition: background 140ms ease, transform 140ms ease; }
        .btn:hover { background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
        .btn:active { transform: scale(.97); }
        .editor { display: grid; gap: 10px; padding-top: 4px; }
        .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
        .dow { text-align: center; font-size: 12px; opacity: .75; }
        .day { min-height: 34px; border: 1px solid transparent; border-radius: 9px; background: transparent; color: var(--primary-text-color); cursor: pointer; font: inherit; touch-action: manipulation; user-select: none; -webkit-touch-callout: none; transition: border-color 140ms ease, background 140ms ease, transform 140ms ease; }
        .day:hover { border-color: color-mix(in srgb, var(--primary-color) 55%, transparent); background: color-mix(in srgb, var(--primary-color) 7%, transparent); }
        .day:active { transform: scale(.96); }
        .day.active { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: var(--primary-color); box-shadow: 0 2px 5px color-mix(in srgb, var(--primary-color) 28%, transparent); }
        .day.predicted { border: 1px dashed #60a5fa; }
        .day.active.predicted { border-color: #bfdbfe; }
        .forecast-mark { display: block; height: 0; color: #60a5fa; font-size: 1.1rem; line-height: 0; transform: translateY(-2px); }
        .day.phase-menstruation { box-shadow: inset 0 -4px 0 #fb7185; }
        .day.phase-follicular { box-shadow: inset 0 -4px 0 #f59e0b; }
        .day.phase-ovulation { box-shadow: inset 0 -4px 0 #60a5fa; }
        .day.phase-luteal { box-shadow: inset 0 -4px 0 #1e3a8a; }
        .day.range-start { border-radius: 12px 6px 6px 12px; }
        .day.range-end { border-radius: 6px 12px 12px 6px; }
        .day.pending-range { background: color-mix(in srgb, var(--primary-color) 24%, var(--card-background-color)); border-color: var(--primary-color); box-shadow: inset 0 -3px 0 var(--primary-color); }
        .day.today { outline: 2px solid var(--primary-color); }
        .day.other { opacity: .3; }
        .range-help { font-size: .78rem; color: var(--secondary-text-color); padding: 6px 8px; border-radius: 6px; background: color-mix(in srgb, var(--primary-color) 8%, transparent); }
        .phase-legend { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: .72rem; color: var(--secondary-text-color); }
        .phase-key { display: inline-flex; align-items: center; gap: 4px; }
        .phase-dot { width: 9px; height: 9px; border-radius: 50%; }
        @media (max-width: 420px) { .overview { grid-template-columns: 1fr; } .card-header { align-items: stretch; flex-direction: column; gap: 10px; } .toolbar { justify-content: flex-start; } .month-control { justify-items: start; } .stats-row, .phase-stat-grid { grid-template-columns: repeat(2, 1fr); } .phase-tabs { grid-template-columns: repeat(2, 1fr); } }
      </style>
      <ha-card>
        <div class="wrap">
          <div class="card-header">
            ${(friendlyName || cardTitle) ? `
            <div class="head">
              ${friendlyName ? `<div class="friendly">${friendlyName}</div>` : ''}
              ${cardTitle ? `<div class="title-label">${cardTitle}</div>` : ''}
            </div>` : '<div></div>'}
            <div class="toolbar">
              <div class="month-control">
                <div class="title">${monthYear}</div>
                <div class="nav">
                  <button type="button" class="btn" data-nav="prev" aria-label="Previous month">←</button>
                  <button type="button" class="btn" data-nav="today">Today</button>
                  <button type="button" class="btn" data-nav="next" aria-label="Next month">→</button>
                </div>
              </div>
            </div>
          </div>
          <div class="view-switch" role="tablist" aria-label="Cycle view">
          <button type="button" class="${viewMode === 'gauge' ? 'active' : ''}" data-view-mode="gauge" role="tab" aria-selected="${viewMode === 'gauge'}">Gauge</button>
          <button type="button" class="${viewMode === 'calendar' ? 'active' : ''}" data-view-mode="calendar" role="tab" aria-selected="${viewMode === 'calendar'}">Calendar</button>
          <button type="button" class="${viewMode === 'details' ? 'active' : ''}" data-view-mode="details" role="tab" aria-selected="${viewMode === 'details'}">Details</button>
          </div>
          ${viewMode === 'gauge' ? `<div class="gauge-wrap">
          ${this._renderGauge(model, palette)}
          <div class="center"><span class="countdown">${countdown}</span></div>
          </div>` : viewMode === 'details' ? this._renderCycleOverview(model) : ''}
          ${viewMode === 'calendar' ? `
          ${this._config.show_editor !== false ? `
          <div class="editor">
            ${String(this._config?.calendar_selection_mode || 'range').toLowerCase() === 'range'
              ? `<div class="range-help">${this._rangeStart && !this._rangeEnd ? `Start selected: <strong>${this._rangeStart}</strong> — click the end date` : 'Click the first day, then the last day of the cycle.'} Right-click a saved range (or hold it on mobile) to delete it.</div>`
              : ''}
            <div class="grid">${this._calendarGrid(model, locale)}</div>
            <div class="phase-legend">
              <span class="phase-key"><span class="phase-dot" style="background:#fb7185"></span>Menstruation</span>
              <span class="phase-key"><span class="phase-dot" style="background:#f59e0b"></span>Follicular</span>
              <span class="phase-key"><span class="phase-dot" style="background:#60a5fa"></span>Ovulation</span>
              <span class="phase-key"><span class="phase-dot" style="background:#1e3a8a"></span>Luteal</span>
            </div>
          </div>` : ''}` : ''}
        </div>
      </ha-card>
    `;

    this._attachHandlers();
    this._lastRenderedEntityId = model.entityId;
    this._lastRenderedStateObj = model.stateObj;
    this._lastRenderedTheme = this._resolveThemeMode();
  }
}

class MenstrualCycleGaugeCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      view_mode: 'gauge',
      theme_mode: 'auto',
      show_fertile_period: true,
      calendar_edit_enabled: true,
      calendar_selection_mode: 'range',
      ...config
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    // Avoid stealing focus while user is typing in the editor.
    if (this.shadowRoot?.activeElement) return;
    this._render();
  }

  _emit(nextConfig) {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: nextConfig },
      bubbles: true,
      composed: true
    }));
  }

  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    const form = document.createElement('ha-form');
    form.hass = this._hass;
    form.data = { ...this._config };
    const labels = {
      entity: 'Entity',
      friendly_name: 'Friendly name',
      title: 'Title',
      view_mode: 'View',
      theme_mode: 'Theme',
      show_fertile_period: 'Show fertile period',
      calendar_edit_enabled: 'Allow calendar editing',
      calendar_selection_mode: 'Calendar selection'
    };
    form.computeLabel = (schema) => labels[schema.name] || schema.name;
    form.schema = [
      { name: 'entity', required: true, selector: { entity: { domain: 'sensor' } } },
      { name: 'friendly_name', selector: { text: {} } },
      { name: 'title', selector: { text: {} } },
      {
        name: 'view_mode',
        selector: {
          select: {
            options: [
              { value: 'gauge', label: 'Gauge' },
              { value: 'calendar', label: 'Calendar' },
              { value: 'details', label: 'Details' }
            ],
            mode: 'dropdown'
          }
        }
      },
      {
        name: 'theme_mode',
        selector: {
          select: {
            options: [
              { value: 'auto', label: 'Automatic' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' }
            ],
            mode: 'dropdown'
          }
        }
      },
      { name: 'show_fertile_period', selector: { boolean: {} } },
      { name: 'calendar_edit_enabled', selector: { boolean: {} } },
      {
        name: 'calendar_selection_mode',
        selector: {
          select: {
            options: [
              { value: 'range', label: 'Start and end date (range)' },
              { value: 'toggle', label: 'Single-day add/remove' }
            ],
            mode: 'dropdown'
          }
        }
      }
    ];
    form.addEventListener('value-changed', (event) => {
      this._emit({ ...this._config, ...event.detail.value });
    });
    this.shadowRoot.replaceChildren(form);
  }

}

if (!customElements.get('menstrual-cycle-gauge-card')) {
  customElements.define('menstrual-cycle-gauge-card', MenstrualCycleGaugeCard);
}
if (!customElements.get('menstrual-cycle-gauge-card-editor')) {
  customElements.define('menstrual-cycle-gauge-card-editor', MenstrualCycleGaugeCardEditor);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'menstrual-cycle-gauge-card',
  name: 'Menstrual Cycle Companion',
  description: 'Cycle gauge, calendar, and details card with profile support.'
});
