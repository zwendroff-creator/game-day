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
  { date: '2026-11-27', place: 'Ostrava', ...WC },
  { date: '2026-11-29', place: 'Tábor', ...WC },
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
  { date: '2026-12-06', place: 'Ruddervoorde', ...SP },
  { date: '2026-12-25', place: 'Heusden-Zolder', ...SP },
  { date: '2026-12-30', place: 'Diegem', ...SP },
  { date: '2027-01-02', place: 'Gullegem', ...SP },
  // X2O Trofee
  { date: '2026-11-01', place: 'Koppenberg', ...X2O },
  { date: '2026-11-15', place: 'Hamme-Zogge', ...X2O },
  { date: '2026-11-22', place: 'Beringen', ...X2O },
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
