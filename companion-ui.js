import {CREATURES, ITEM_CATEGORIES, unspentCreatureEntitlements, unspentItemEntitlements, nextMasteryThreshold, daysUntilNextItem} from './rewards.js';
const CATALOG_ERROR = 'Companion art is not ready yet. Please try again soon.';
const TABS = [['creatures', 'Creatures'], ['badge', 'Badges'], ['decoration', 'Decor'], ['background', 'Backgrounds']];
const entry = (catalog, group, id) => catalog?.[group]?.find(e => e.id === id);
export function scene(catalog, rewards, cls, showMessage = true, compact = false) {
  const creature = entry(catalog, 'creatures', rewards.selected.creature);
  if (!creature) return `<div class="${cls} companion-scene-empty">${showMessage ? `<p class="small muted">${CATALOG_ERROR}</p>` : ''}</div>`;
  const background = compact ? null : entry(catalog, 'backgrounds', rewards.selected.background);
  const decoration = compact ? null : entry(catalog, 'decorations', rewards.selected.decoration);
  const badge = rewards.selected.badge ? entry(catalog, 'badges', rewards.selected.badge) : null;
  return `<div class="${cls}${decoration ? ' has-decoration' : ''}"${background ? ` style="background-image:url('${background.src}');--ground-inset:${100 - (background.groundY ?? 86)}cqw"` : ''}>${decoration ? `<img class="scene-decoration" src="${decoration.src}" alt="${decoration.label}">` : ''}<div class="scene-companion"><div class="companion-motion"><img class="scene-creature" src="${creature.src}" alt="${creature.label}">${badge && creature.badge ? `<img class="scene-badge" style="left:${creature.badge.x}%;top:${creature.badge.y}%;width:${creature.badge.width}%" src="${badge.src}" alt="${badge.label} badge">` : ''}</div></div></div>`;
}
export function companionHomeStatus(state, catalog, button) {
  const r = state.rewards;
  const unspent = unspentCreatureEntitlements(r) + unspentItemEntitlements(r);
  const art = entry(catalog, 'creatures', r.selected.creature);
  return `<section class="companion-status"><h2 class="sr-only">Your companion</h2>${scene(catalog, r, 'companion-scene-large home-world', false)}<p>${art?.label ?? r.selected.creature}</p>${unspent > 0 ? `<p class="companion-ready" role="status">${unspent} new reward${unspent === 1 ? '' : 's'} ready to claim!</p>` : ''}${button('My creatures', 'companions', 'text-button')}</section>`;
}
function card(id, name, ariaName, art, owned, selected, unspent, selectAction, claimAction, button) {
  let action, actionLabel, disabled = '';
  if (owned) { action = selectAction; actionLabel = selected ? 'Selected' : 'Choose'; if (selected) disabled = 'disabled'; }
  else if (!art) { action = 'companion-noop'; actionLabel = 'Coming soon'; disabled = 'disabled'; }
  else if (unspent > 0) { action = claimAction; actionLabel = 'Claim'; }
  else { action = 'companion-noop'; actionLabel = 'Locked'; disabled = 'disabled'; }
  const status = owned ? (selected ? 'Selected' : 'Owned') : art ? (unspent > 0 ? 'Ready to claim' : 'Locked') : 'Coming soon';
  const thumb = art ? `<img src="${art.src}" alt="" width="88" height="88">` : '<span class="companion-thumb-empty" aria-hidden="true">?</span>';
  return `<div class="companion-card" role="listitem">${thumb}<p>${name}</p><p class="small muted">${status}</p>${button(actionLabel, action, 'companion-action', `${disabled} aria-label="${actionLabel} ${ariaName}"`)}</div>`;
}
// Only approved, delivered manifest entries get a card. Keep ownership data intact when art is absent.
function offeredIds(list, catalogGroup, owned) {
  const delivered = new Set((catalogGroup ?? []).map(e => e.id));
  return list.filter(id => delivered.has(id));
}
function unclaimedOfferedIds(list, catalogGroup, owned) { return offeredIds(list, catalogGroup, owned).filter(id => !owned.includes(id)); }
function creatureGrid(state, catalog, button) {
  const r = state.rewards, unspent = unspentCreatureEntitlements(r);
  return `<div class="companion-grid" role="list">${offeredIds(CREATURES, catalog?.creatures, r.owned.creatures).map(id => {
    const art = entry(catalog, 'creatures', id), name = art?.label ?? id;
    return card(id, name, name, art, r.owned.creatures.includes(id), r.selected.creature === id, unspent, `companion-select:creature:${id}`, `companion-claim:creature:${id}`, button);
  }).join('')}</div>`;
}
function itemGrid(state, catalog, button, slot) {
  const {key, list} = ITEM_CATEGORIES[slot];
  const r = state.rewards, unspent = unspentItemEntitlements(r);
  const noneSelected = r.selected[slot] === null;
  const none = `<div class="companion-card" role="listitem"><span class="companion-thumb-empty" aria-hidden="true">–</span><p>None</p><p class="small muted">${noneSelected ? 'Selected' : 'Plain default'}</p>${button(noneSelected ? 'Selected' : 'Choose', `companion-select:${slot}:none`, 'companion-action', `${noneSelected ? 'disabled' : ''} aria-label="${noneSelected ? 'Selected' : 'Choose'} no ${slot}"`)}</div>`;
  const cards = offeredIds(list, catalog?.[key], r.owned[key]).map(id => {
    const art = entry(catalog, key, id), name = art?.label ?? id;
    return card(id, name, `${name} ${slot}`, art, r.owned[key].includes(id), r.selected[slot] === id, unspent, `companion-select:${slot}:${id}`, `companion-claim:${slot}:${id}`, button);
  }).join('');
  const missing = slot === 'decoration' ? (catalog?.missingDecorations?.length ?? 0) : 0;
  const missingNote = missing > 0 ? `<p class="small muted">${missing} decoration${missing === 1 ? '' : 's'} await design and artwork approval. Your unspent item credits are kept.</p>` : '';
  return `<div class="companion-grid" role="list">${none}${cards}</div>${missingNote}`;
}
function progressText(rewards, masteredFactCount, creatureClaimable, itemClaimable) {
  const parts = [];
  parts.push(`${rewards.creatureEntitlements} of 4 creature choices earned permanently.`);
  if (typeof masteredFactCount === 'number') {
    parts.push(`${masteredFactCount} facts mastered so far.`);
    const next = nextMasteryThreshold(rewards);
    parts.push(next ? `Next creature at ${next} facts mastered.` : 'Every creature milestone is unlocked.');
  }
  const unspentCreature = unspentCreatureEntitlements(rewards), unspentItem = unspentItemEntitlements(rewards);
  if (unspentCreature > 0) parts.push(creatureClaimable > 0 ? `${unspentCreature} new creature choice${unspentCreature === 1 ? '' : 's'} ready.` : `${unspentCreature} earned creature choice${unspentCreature === 1 ? '' : 's'} ${unspentCreature === 1 ? 'is' : 'are'} saved for a new creature to arrive.`);
  if (unspentItem > 0) parts.push(itemClaimable > 0 ? `${unspentItem} new item${unspentItem === 1 ? '' : 's'} ready to claim.` : `${unspentItem} earned item credit${unspentItem === 1 ? '' : 's'} ${unspentItem === 1 ? 'is' : 'are'} saved for future items.`);
  const days = daysUntilNextItem(rewards.ledger.length);
  parts.push(`${days} more day${days === 1 ? '' : 's'} of practice unlocks your next item reward.`);
  return parts.join(' ');
}
export function companionScreen(state, catalog, catalogError, tab, button, heading, {masteredFactCount} = {}) {
  const r = state.rewards;
  const tabs = `<div class="companion-tabs" role="tablist" aria-label="Companion collection">${TABS.map(([key, label]) => button(label, `companion-tab:${key}`, key === tab ? 'companion-tab selected' : 'companion-tab', `role="tab" aria-selected="${key === tab}"`)).join('')}</div>`;
  const grid = tab === 'creatures' ? creatureGrid(state, catalog, button) : itemGrid(state, catalog, button, tab);
  const creatureClaimable = unclaimedOfferedIds(CREATURES, catalog?.creatures, r.owned.creatures).length;
  const itemClaimable = Object.entries(ITEM_CATEGORIES).reduce((n, [, {key, list}]) => n + unclaimedOfferedIds(list, catalog?.[key], r.owned[key]).length, 0);
  const progress = progressText(r, masteredFactCount, creatureClaimable, itemClaimable);
  return `<section class="companions-page">${button('← Home', 'home', 'text-button')}${heading('YOUR COMPANIONS', 'My creatures', 'A friendly companion for your practice space.')}${scene(catalog, r, 'companion-scene-large')}${catalogError ? `<p class="companion-notice" role="status">${catalogError}</p>` : ''}<details class="how-it-works"><summary>How rewards work</summary><p class="small muted">${progress}</p></details>${tabs}${grid}</section>`;
}
