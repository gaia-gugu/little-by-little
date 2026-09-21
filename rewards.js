export const CREATURES = ['dragon', 'moonbunny', 'griffin', 'seadragon', 'unicorn', 'forestcreature'];
export const STARTER_CREATURES = ['dragon', 'moonbunny'];
export const LOCKED_CREATURES = CREATURES.filter(id => !STARTER_CREATURES.includes(id));
export const MASTERY_THRESHOLDS = [12, 36, 72, 120];
export const BADGES = ['star', 'moon', 'heart', 'rainbow', 'flower', 'planet'];
export const DECORATIONS = ['castle', 'crystals', 'magicbook', 'flowerpot', 'lantern', 'treasurechest'];
export const BACKGROUNDS = ['starrysky', 'cloudgarden', 'mushroommeadow', 'moonlitlake', 'cosylibrary', 'candyhills'];
export const ITEM_CATEGORIES = {badge: {key: 'badges', list: BADGES}, decoration: {key: 'decorations', list: DECORATIONS}, background: {key: 'backgrounds', list: BACKGROUNDS}};
export function createRewards() {
  return {creatureEntitlements: 0, owned: {creatures: [...STARTER_CREATURES], badges: [], decorations: [], backgrounds: []}, selected: {creature: 'dragon', badge: null, decoration: null, background: null}, ledger: []};
}
export function creatureEntitlementsEarned(masteredFacts) { return MASTERY_THRESHOLDS.filter(t => masteredFacts >= t).length; }
// A normal round or completed challenge credits its own local start day once; listening and active/interrupted rounds never appear in these arrays.
export function ledgerDates(state) {
  const days = new Set();
  for (const r of state.results) days.add(r.day);
  for (const r of (state.challenge?.results ?? [])) days.add(r.day);
  return [...days].sort();
}
// Item-entitlement days: 1, 4, 7, 10, ... (every third credited calendar day, cumulative, no streak reset).
export function itemEntitlementsEarned(ledgerLength) { return ledgerLength > 0 ? Math.floor((ledgerLength - 1) / 3) + 1 : 0; }
// masteredFactCount is supplied by the caller (core.js's mastery()); this module never imports core.js, to keep createState() free to depend on createRewards().
// syncRewards only ever ratchets creature entitlements upward. It never touches the ledger: the ledger is a permanent,
// append-only record credited exactly once per real completion (see creditCompletionDay), independent of — and never
// derived or replaced from — the current contents of state.results/state.challenge.results.
export function syncRewards(state, masteredFactCount) {
  state.rewards ??= createRewards();
  const rewards = state.rewards;
  rewards.creatureEntitlements = Math.max(rewards.creatureEntitlements, creatureEntitlementsEarned(masteredFactCount));
  return rewards;
}
// Call exactly once, at the real moment a normal round or timed challenge actually completes, with today's local day
// (never the round's start day). Idempotent and permanent: a date already credited is never removed or re-added.
export function creditCompletionDay(rewards, day) {
  if (rewards.ledger.includes(day)) return false;
  rewards.ledger = [...rewards.ledger, day].sort();
  return true;
}
export function unspentCreatureEntitlements(rewards) { return rewards.creatureEntitlements - (rewards.owned.creatures.length - STARTER_CREATURES.length); }
// The next unearned mastery threshold, by entitlement highwater index (never by the current live mastered count,
// which can drop) — or null once every threshold has been earned.
export function nextMasteryThreshold(rewards) { return MASTERY_THRESHOLDS[rewards.creatureEntitlements] ?? null; }
// How many more credited calendar days until the next item-entitlement milestone (day 1, then every 3rd day after).
export function daysUntilNextItem(ledgerLength) { return (1 + itemEntitlementsEarned(ledgerLength) * 3) - ledgerLength; }
function ownedItemCount(rewards) { return rewards.owned.badges.length + rewards.owned.decorations.length + rewards.owned.backgrounds.length; }
export function unspentItemEntitlements(rewards) { return itemEntitlementsEarned(rewards.ledger.length) - ownedItemCount(rewards); }
export function claimCreature(rewards, id) {
  if (!LOCKED_CREATURES.includes(id) || rewards.owned.creatures.includes(id) || unspentCreatureEntitlements(rewards) <= 0) return false;
  rewards.owned.creatures.push(id);
  return true;
}
export function claimItem(rewards, category, id, available) {
  const entry = ITEM_CATEGORIES[category];
  if (!entry || !entry.list.includes(id) || !available.includes(id)) return false;
  if (rewards.owned[entry.key].includes(id) || unspentItemEntitlements(rewards) <= 0) return false;
  rewards.owned[entry.key].push(id);
  return true;
}
export function deriveRewards(state, masteredFactCount) {
  const rewards = createRewards();
  rewards.ledger = ledgerDates(state);
  rewards.creatureEntitlements = creatureEntitlementsEarned(masteredFactCount);
  return rewards;
}
// A legacy (pre-rewards) import can never legitimately carry ownership or a selection of its own — deriveRewards()
// always starts a legacy import from the two free starters and no items. So this only ever raises the device's
// entitlement highwater and unions in genuinely earned ledger dates; the device's own ownership and selection are
// kept exactly as they are (never unioned, defensively, even if a malformed importedRewards claimed ownership).
export function mergeLegacyRewards(deviceRewards, importedRewards) {
  const merged = structuredClone(deviceRewards);
  merged.creatureEntitlements = Math.max(deviceRewards.creatureEntitlements, importedRewards.creatureEntitlements);
  merged.ledger = [...new Set([...deviceRewards.ledger, ...importedRewards.ledger])].sort();
  return merged;
}
export function validateRewards(r, {check, shape, integer, date}) {
  shape(r, ['creatureEntitlements', 'owned', 'selected', 'ledger']);
  check(integer(r.creatureEntitlements, 0, MASTERY_THRESHOLDS.length));
  shape(r.owned, ['creatures', 'badges', 'decorations', 'backgrounds']);
  check(Array.isArray(r.owned.creatures) && new Set(r.owned.creatures).size === r.owned.creatures.length && r.owned.creatures.every(id => CREATURES.includes(id)));
  check(STARTER_CREATURES.every(id => r.owned.creatures.includes(id)));
  check(r.owned.creatures.length - STARTER_CREATURES.length <= r.creatureEntitlements);
  for (const [key, list] of [['badges', BADGES], ['decorations', DECORATIONS], ['backgrounds', BACKGROUNDS]]) check(Array.isArray(r.owned[key]) && r.owned[key].length <= list.length && new Set(r.owned[key]).size === r.owned[key].length && r.owned[key].every(id => list.includes(id)));
  check(Array.isArray(r.ledger) && r.ledger.length <= 100000 && new Set(r.ledger).size === r.ledger.length && r.ledger.every(d => date(d)) && JSON.stringify(r.ledger) === JSON.stringify([...r.ledger].sort()));
  check(ownedItemCount(r) <= itemEntitlementsEarned(r.ledger.length));
  shape(r.selected, ['creature', 'badge', 'decoration', 'background']);
  check(r.owned.creatures.includes(r.selected.creature));
  check(r.selected.badge === null || r.owned.badges.includes(r.selected.badge));
  check(r.selected.decoration === null || r.owned.decorations.includes(r.selected.decoration));
  check(r.selected.background === null || r.owned.backgrounds.includes(r.selected.background));
}
export function selectCompanion(rewards, slot, id) {
  if (slot === 'creature') {
    if (id === null || !rewards.owned.creatures.includes(id)) return false;
    rewards.selected.creature = id;
    return true;
  }
  const entry = ITEM_CATEGORIES[slot];
  if (!entry) return false;
  if (id !== null && !rewards.owned[entry.key].includes(id)) return false;
  rewards.selected[slot] = id;
  return true;
}
