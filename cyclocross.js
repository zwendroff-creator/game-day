// Cyclocross races for the 2026–27 season. No free feed covers cyclocross,
// so this list is kept by hand. Update it each autumn when the calendars
// come out. Sources: ucicyclocrossworldcup.com, superprestigecyclocross.be,
// cyclinguptodate.com (checked 2026-11-19).
// US viewing (cyclingnews, 2026–27): World Cup on FloBikes and HBO Max;
// other European races mostly on HBO Max.

const WC = { series: 'UCI Cyclocross World Cup', watch: ['FloBikes', 'HBO Max'] };
const SP = { series: 'Superprestige', watch: ['HBO Max'] };
const X2O = { series: 'X2O Trofee', watch: ['HBO Max'] };
const CHAMPS = { watch: ['HBO Max', 'FloBikes'] };

export const CYCLOCROSS = [
  // World Cup
  { date: '2026-11-27', place: 'Ostrava', times: { women: '18:15', men: '19:45' }, ...WC },
  { date: '2026-11-29', place: 'Tábor', times: { women: '13:00', men: '14:30' }, ...WC },
  { date: '2026-12-13', place: 'Glasgow', ...WC },
  { date: '2026-12-19', place: 'Antwerp', ...WC },
  { date: '2026-12-20', place: 'Koksijde', ...WC },
  { date: '2026-12-26', place: 'Gavere', ...WC },
  { date: '2026-12-27', place: 'Namur', ...WC },
  { date: '2026-12-29', place: 'Besançon', ...WC },
  { date: '2027-01-03', place: 'Zonhoven', ...WC },
  { date: '2027-01-17', place: 'Benidorm', ...WC },
  { date: '2027-01-23', place: 'Hamme', ...WC },
  { date: '2027-01-24', place: 'Hoogerheide', ...WC },
  // Superprestige
  { date: '2026-10-25', place: 'Overijse', ...SP },
  { date: '2026-11-05', place: 'Middelkerke', ...SP },
  { date: '2026-11-11', place: 'Niel', ...SP },
  { date: '2026-11-14', place: 'Merksplas', ...SP },
  { date: '2026-12-06', place: 'Ruddervoorde', times: { women: '13:40', men: '15:10' }, ...SP },
  { date: '2026-12-25', place: 'Heusden-Zolder', ...SP },
  { date: '2026-12-30', place: 'Diegem', ...SP },
  { date: '2027-01-02', place: 'Gullegem', ...SP },
  // X2O Trofee
  { date: '2026-11-01', place: 'Koppenberg', ...X2O },
  { date: '2026-11-15', place: 'Hamme-Zogge', ...X2O },
  { date: '2026-11-22', place: 'Beringen', times: { women: '13:45', men: '15:00' }, ...X2O },
  { date: '2026-12-22', place: 'Hofstade', ...X2O },
  { date: '2026-12-23', place: 'Loenhout', ...X2O },
  { date: '2027-01-01', place: 'Baal', ...X2O },
  { date: '2027-02-07', place: 'Lille', ...X2O },
  { date: '2027-02-14', place: 'Brussels', ...X2O },
  // Championships
  { date: '2026-11-07', place: 'Zeddam', series: 'European Championships', ...CHAMPS },
  { date: '2026-11-08', place: 'Zeddam', series: 'European Championships', ...CHAMPS },
  { date: '2027-01-29', place: 'Ostend', series: 'World Championships', ...CHAMPS },
  { date: '2027-01-30', place: 'Ostend', series: 'World Championships', ...CHAMPS },
  { date: '2027-01-31', place: 'Ostend', series: 'World Championships', ...CHAMPS },
];

// --- Start times -------------------------------------------------------------
// Elite start times in the list above (`times`) are local European time, copied
// from each race's cyclocross24.com page (checked 2026-11-20). Add them as
// schedules come out, usually a week or two before each race.
export function cxListedTimes(race, timeZone = 'Europe/Brussels') {
  if (!race.times) return null;
  const out = {};
  for (const key of ['women', 'men']) {
    if (!race.times[key]) continue;
    const local = `${race.date}T${race.times[key]}:00`;
    out[key] = new Date(`${local}${offsetAt(new Date(`${local}Z`), timeZone)}`).toISOString();
  }
  return out;
}

// The publish job reads each race's schedule from cyclocross24.com (local
// Belgian time on its pages) and saves the elite start times to cx-times.json,
// keyed by `${date}|${place}`. Races without times stay "All day".
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// cyclocross24 page names to try for a place, best first.
const SLUG_ALIASES = { 'Hamme-Zogge': ['hamme'], Ostend: ['oostende'], Koppenberg: ['oudenaarde', 'koppenberg'], Brussels: ['brussel', 'brussels'], 'Tábor': ['tabor'] };
export function cxSlugs(place) {
  const base = place.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return [...new Set([...(SLUG_ALIASES[place] ?? []), base, base.split('-')[0]])];
}

// Offset of a time zone at a moment, as "+01:00".
function offsetAt(date, timeZone) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(date).find((p) => p.type === 'timeZoneName').value;
  const m = name.match(/GMT([+-]\d{2}):?(\d{2})?/);
  return m ? `${m[1]}:${m[2] ?? '00'}` : '+00:00';
}

// Reads the elite start times from a race page. Returns null unless the page
// is for this date (some towns host more than one race a season).
export function parseCxSchedule(html, date, timeZone = 'Europe/Brussels') {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const [y, m, d] = date.split('-').map(Number);
  if (!text.includes(`${d} ${MONTHS[m - 1]} ${y}`)) return null;
  // Only look inside the schedule block, so clocks elsewhere on the page
  // (like "Time in your timezone") aren't mistaken for start times.
  const from = text.indexOf('Schedule');
  if (from < 0) return null;
  const end = text.indexOf('Local Time', from);
  const schedule = text.slice(from, end < 0 ? from + 2000 : end);
  const out = {};
  for (const [key, label] of [['women', 'Women Elite'], ['men', 'Men Elite']]) {
    const hit = schedule.match(new RegExp(`(\\d{1,2}):(\\d{2})\\s+(?:\\d{1,2}:\\d{2}\\s+)?${label}`));
    // Elite races start between 8 AM and 10 PM local time; anything else is a misread.
    if (!hit || Number(hit[1]) < 8 || Number(hit[1]) > 22) continue;
    const local = `${date}T${hit[1].padStart(2, '0')}:${hit[2]}:00`;
    out[key] = new Date(`${local}${offsetAt(new Date(`${local}Z`), timeZone)}`).toISOString();
  }
  return out.women || out.men ? out : null;
}
