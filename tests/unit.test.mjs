/* Tourist Spots BD — node unit tests (no deps). Run: node tests/unit.test.mjs */
import data from '../js/data.js';
import L from '../js/logic.js';
const { SPOTS, DIVISIONS, CATEGORIES, MONTHS_EN, MONTHS_BN } = data;

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

// --- data integrity ---
check('24 spots', SPOTS.length === 24, 'got ' + SPOTS.length);
check('all 8 divisions covered', DIVISIONS.every((d) => SPOTS.some((s) => s.division === d)));
check('unique ids', new Set(SPOTS.map((s) => s.id)).size === SPOTS.length);
check('every spot has EN + BN name/desc/reach/tip', SPOTS.every((s) =>
  s.name && s.bn && s.desc && s.descBn && s.reach && s.reachBn && s.tip && s.tipBn));
check('every spot has valid category', SPOTS.every((s) => CATEGORIES.includes(s.category)));
check('every spot has valid division', SPOTS.every((s) => DIVISIONS.includes(s.division)));
check('months are 1..12, non-empty', SPOTS.every((s) => s.months.length > 0 && s.months.every((m) => m >= 1 && m <= 12)));
check('days are 1..3', SPOTS.every((s) => s.days >= 1 && s.days <= 3));
check('entry is free/ticketed/permit', SPOTS.every((s) => ['free', 'ticketed', 'permit'].includes(s.entry)));
check('no taka fee amounts in data', !JSON.stringify(SPOTS).match(/৳\s?\d|BDT\s?\d|Tk\.?\s?\d/));
check('Sundarbans needs a permit', SPOTS.find((s) => s.id === 'sundarbans').entry === 'permit');
check('Ratargul is a monsoon spot (Jun–Sep)', JSON.stringify(SPOTS.find((s) => s.id === 'ratargul').months) === '[6,7,8,9]');
check('guava market is Jul–Aug only', JSON.stringify(SPOTS.find((s) => s.id === 'guava-market').months) === '[7,8]');
check('counts by division sum to 24', Object.values(L.countByDivision(SPOTS)).reduce((a, b) => a + b, 0) === 24);

// --- logic ---
check('bnDigits converts', L.bnDigits(2026, 'bn') === '২০২৬' && L.bnDigits(24, 'en') === '24');
check('seasonLabel wraps Nov–Feb', L.seasonLabel([11, 12, 1, 2], 'en', MONTHS_EN, MONTHS_BN) === 'Nov–Feb');
check('seasonLabel wraps Oct–Mar', L.seasonLabel([10, 11, 12, 1, 2, 3], 'en', MONTHS_EN, MONTHS_BN) === 'Oct–Mar');
check('seasonLabel single month', L.seasonLabel([7], 'en', MONTHS_EN, MONTHS_BN) === 'Jul–Jul');
check('seasonLabel BN', L.seasonLabel([6, 7, 8, 9], 'bn', MONTHS_EN, MONTHS_BN) === 'জুন–সেপ্টেম্বর');
check('monthName invalid -> empty', L.monthName(0, 'en', MONTHS_EN, MONTHS_BN) === '' && L.monthName(13, 'en', MONTHS_EN, MONTHS_BN) === '');
check('isInSeason: Ratargul in July', L.isInSeason(SPOTS.find((s) => s.id === 'ratargul'), 7) === true);
check('isInSeason: Ratargul not in Jan', L.isInSeason(SPOTS.find((s) => s.id === 'ratargul'), 1) === false);
check('filter by division Sylhet = 4', L.filterSpots(SPOTS, { division: 'Sylhet' }).length === 4);
check('filter by category Beach = 4', L.filterSpots(SPOTS, { category: 'Beach' }).length === 4);
check('filter by month July: Ratargul + guava market only', (() => {
  const r = L.filterSpots(SPOTS, { month: 7 }).map((s) => s.id).sort();
  return JSON.stringify(r) === '["guava-market","ratargul"]';
})());
check('filter by month Nov = 22 (all but Ratargul + guava market)', L.filterSpots(SPOTS, { month: 11 }).length === 22, 'got ' + L.filterSpots(SPOTS, { month: 11 }).length);
check('search EN "cox" finds Cox\'s Bazar', L.filterSpots(SPOTS, { q: 'cox' }).length === 1);
check('search BN "কক্সবাজার" finds it', L.filterSpots(SPOTS, { q: 'কক্সবাজার' }).length === 1);
check('search "sundar" finds Sundarbans', L.filterSpots(SPOTS, { q: 'sundar' }).some((s) => s.id === 'sundarbans'));
check('favOnly filters', L.filterSpots(SPOTS, { favOnly: true, favs: { 'coxs-bazar': true } }).length === 1);
check('sort by name: Ahsan Manzil first', L.sortSpots(SPOTS, 'name')[0].id === 'ahsan-manzil');
check('sort by days: 1-day spots first', L.sortSpots(SPOTS, 'days')[0].days === 1);
check('tripDays: cox(2)+sundarbans(3)=5', L.tripDays(['coxs-bazar', 'sundarbans'], SPOTS) === 5);
check('tripDays dedupes', L.tripDays(['coxs-bazar', 'coxs-bazar'], SPOTS) === 2);
check('tripDays ignores unknown', L.tripDays(['nope'], SPOTS) === 0);
check('tripDivisions groups', JSON.stringify(L.tripDivisions(['coxs-bazar', 'saint-martin', 'jaflong'], SPOTS)) === '{"Chattogram":2,"Sylhet":1}');
check('entryLabel EN/BN', L.entryLabel('permit', 'en') === 'Permit required' && L.entryLabel('free', 'bn') === 'বিনামূল্যে');

// --- import validation ---
check('import valid round-trips', (() => {
  const r = L.validateTripImport({ app: 'tourist-spots-bd', trip: ['coxs-bazar'], favourites: ['jaflong'] }, SPOTS);
  return r.ok && r.trip.length === 1 && r.favourites.length === 1;
})());
check('import rejects wrong app', L.validateTripImport({ app: 'other-app', trip: [] }, SPOTS).ok === false);
check('import rejects unknown spot', L.validateTripImport({ app: 'tourist-spots-bd', trip: ['nope'] }, SPOTS).ok === false);
check('import rejects non-object', L.validateTripImport(null, SPOTS).ok === false);
check('import rejects bad trip type', L.validateTripImport({ app: 'tourist-spots-bd', trip: 'x' }, SPOTS).ok === false);
check('import dedupes trip', (() => {
  const r = L.validateTripImport({ app: 'tourist-spots-bd', trip: ['coxs-bazar', 'coxs-bazar'] }, SPOTS);
  return r.ok && r.trip.length === 1;
})());

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
