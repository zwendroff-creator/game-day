// Sends Victor's morning rundown as a push notification.
// Runs once a day from GitHub Actions (see .github/workflows/morning.yml).
//
// Secrets it needs:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  the app's push keys
//   PUSH_SETUP                           the setup code Victor copied from the app
//                                        (his phone's push address plus his teams)
import webpush from 'web-push';
import { loadToday } from '../feeds.js';
import { DEFAULT_TEAMS } from '../sources.js';

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });

export function summarize({ mine, big, other }) {
  const line = (i) => `${i.allDay ? '' : timeFmt.format(i.start) + ' '}${i.tag && i.section === 'big' ? i.tag + ': ' : ''}${i.title}`;
  const parts = [];
  if (mine.length) parts.push(...mine.map(line));
  if (big.length) parts.push(...big.slice(0, 3).map(line));
  if (other.length) parts.push(...other.slice(0, 2).map(line));
  if (!parts.length) return null;
  const extra = mine.length + big.length + other.length - parts.length;
  return {
    title: mine.length ? `Game day: ${mine.length} for your teams` : 'On today',
    body: parts.join('\n') + (extra > 0 ? `\n+${extra} more` : ''),
  };
}

async function main() {
  const setup = JSON.parse(Buffer.from(process.env.PUSH_SETUP, 'base64').toString('utf8'));
  // "Today" in Miami, whatever time zone the runner is in.
  const miamiNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  process.env.TZ = 'America/New_York';
  const result = await loadToday({ today: miamiNow, follows: setup.follows?.length ? setup.follows : DEFAULT_TEAMS });
  const msg = summarize(result);
  if (!msg) { console.log('Nothing on today, no notification sent.'); return; }
  webpush.setVapidDetails('https://github.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  await webpush.sendNotification(setup.subscription, JSON.stringify(msg));
  console.log('Sent:', msg.title, '|', msg.body.replace(/\n/g, ' / '));
}

if (process.argv[1]?.endsWith('morning.mjs')) main().catch((e) => { console.error(e); process.exit(1); });
