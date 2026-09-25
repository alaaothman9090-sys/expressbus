// Inline the subset of Lucide icons (ISC license) the simulator uses.
const fs = require('fs');
const want = `house compass receipt-text messages-square circle-user search map-pin map-pinned navigation locate-fixed locate-off bell bell-ring
shopping-bag shopping-basket plus minus x check check-check chevron-left chevron-right chevron-down chevron-up arrow-left arrow-right arrow-up-down
heart star clock timer hourglass bike store utensils-crossed croissant cake-slice pill flower-2 gift pizza coffee cup-soda drumstick soup salad egg milk wheat nut fish flame snowflake leaf
banknote credit-card wallet smartphone coins hand-coins piggy-bank vault receipt
lightbulb triangle-alert wrench circle-check scale badge-help landmark calculator construction badge-check flask-conical file-text clipboard-check circle-help
phone phone-call phone-off phone-missed message-circle send info shield shield-alert shield-check siren lock eye eye-off user users user-round user-cog settings languages sun moon monitor log-out log-in trash-2 pencil copy share-2 refresh-cw rotate-ccw play pause fast-forward skip-forward
wifi wifi-off signal battery-full satellite crosshair zoom-in zoom-out layers route package package-check package-x calendar-clock calendar percent tag ticket badge-percent filter list layout-grid sliders-horizontal
octagon-alert circle-alert circle-x circle-dot circle flag file-search history clipboard-list notebook-pen scroll-text book-open handshake building-2 chef-hat key-round hash at-sign mail globe map door-open gauge activity chart-column trending-up trending-down split shuffle
cloud-off server-crash tablet laptop monitor-smartphone maximize-2 minimize-2 panel-right panel-left menu ellipsis ellipsis-vertical headset briefcase stamp party-popper map-pin-off navigation-off fuel traffic-cone cloud-rain thermometer heart-pulse ambulance hand-helping hand ban circle-slash undo-2 list-checks list-todo square-check square circle-check-big clipboard-x file-warning footprints radar target milestone signpost waypoints
message-square-warning mic volume-2 image camera sticky-note link external-link download upload qr-code scan-line lock-keyhole fingerprint mail-check message-circle-warning store-x user-x user-check user-plus alarm-clock clock-alert clock-arrow-up pause-circle play-circle circle-pause circle-play circle-stop list-filter arrow-down-up sort-asc info-circle eye-closed baby mouse-pointer-2 mouse-pointer-click gavel table sheet bell-off`.split(/\s+/).filter(Boolean);
const path = require('path');
const dir = path.join(path.dirname(require.resolve('lucide-static/package.json')), 'icons/');
const out = {}; const missing = [];
for (const n of want) {
  const f = dir + n + '.svg';
  if (!fs.existsSync(f)) { missing.push(n); continue; }
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/\n\s*/g, '');
  const inner = s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  out[n] = inner;
}
fs.writeFileSync(path.resolve(__dirname, '../src/icons.gen.js'), 'const ICONS=' + JSON.stringify(out) + ';\n');
console.log('icons', Object.keys(out).length, 'missing', missing.join(' '));
console.log('bytes', fs.statSync(path.resolve(__dirname, '../src/icons.gen.js')).size);
