const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const loader = fs.readFileSync(path.join(repoRoot, 'menstrual-cycle-companion.js'), 'utf8');
const cards = {
  gauge: 'menstrual-cycle-companion-gauge.js',
  heatmap: 'menstrual-cycle-companion-heatmap.js',
  calendar: 'menstrual-cycle-companion-calendar.js',
  countdown: 'menstrual-cycle-companion-countdown.js',
  card: 'menstrual-cycle-companion-card.js',
  'compact-status': 'menstrual-cycle-companion-compact-status.js',
  'history-row': 'menstrual-cycle-companion-history-row.js',
  'product-inventory': 'menstrual-cycle-companion-product-inventory.js',
  statistics: 'menstrual-cycle-companion-statistics.js',
};

for (const [name, filename] of Object.entries(cards)) {
  const source = fs.readFileSync(path.join(repoRoot, filename), 'utf8');
  const publicName = `menstrual-cycle-companion-${name}`;

  assert.ok(source.includes(`custom:${publicName}`), `${filename} has no branded stub type`);
  assert.ok(source.includes(`'${publicName}'`) || source.includes(`"${publicName}"`), `${filename} has no branded registration`);
}

const legacy = {
  'menstrual-gauge-card.js': cards.gauge,
  'menstrual-cycle-gauge-card.js': cards.gauge,
  'menstrual-cycle-heatmap-card.js': cards.heatmap,
  'menstrual-calendar-card.js': cards.calendar,
  'menstrual-countdown-timer.js': cards.countdown,
  'menstrual-cycle-card-compact.js': cards.card,
  'menstrual-cycle-compact-status-card.js': cards['compact-status'],
  'menstrual-cycle-history-card-row.js': cards['history-row'],
  'menstrual-product-inventory-card.js': cards['product-inventory'],
  'menstrual-statistics-card.js': cards.statistics,
};

for (const [legacyFilename, canonicalFilename] of Object.entries(legacy)) {
  const content = fs.readFileSync(path.join(repoRoot, legacyFilename), 'utf8');
  assert.ok(content.includes(`import './${canonicalFilename}';`), `${legacyFilename} is not a canonical loader`);
  assert.ok(content.length < 200, `${legacyFilename} still contains a duplicate implementation`);
}

const integrationWww = path.resolve(
  repoRoot,
  '..',
  'Menstrual-Cycle-Companion',
  'custom_components',
  'menstrual_cycle_companion',
  'www'
);
assert.ok(!fs.existsSync(integrationWww), 'integration www/ must not exist');

for (const filename of ['menstrual-i18n.js', 'menstrual-icons.js', ...Object.values(cards)]) {
  assert.ok(loader.includes(`import './${filename}';`), `collection loader does not import ${filename}`);
}
assert.ok(
  fs.readFileSync(path.join(repoRoot, 'menstrual-i18n.js'), 'utf8').includes(
    '/hacsfiles/menstrual-cycle-companion-cards/translations/'
  ),
  'translations must be loaded from the standalone cards repository'
);

const gauge = fs.readFileSync(path.join(repoRoot, cards.gauge), 'utf8');
for (const alias of ['menstrual-gauge-card', 'menstrual-cycle-gauge-card', 'menstruation-gauge-card']) {
  assert.ok(gauge.includes(`'${alias}'`), `missing gauge compatibility alias ${alias}`);
}

console.log('Card resource naming, standalone loading, and no-bundle compatibility tests passed.');

