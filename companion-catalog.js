// The sibling art pipeline owns assets/companions/v1/** and its manifest.json exclusively; this module only ever reads it.
export const MANIFEST_PATH = './assets/companions/v1/manifest.json';
const NOT_READY = 'Companion art is not ready yet. Please try again soon.';
const GROUPS = ['creatures', 'badges', 'backgrounds', 'decorations'];
function validEntry(entry, group) {
  if (!entry || typeof entry !== 'object') return false;
  if (typeof entry.id !== 'string' || !entry.id || typeof entry.label !== 'string' || !entry.label || typeof entry.src !== 'string' || !entry.src) return false;
  if (group === 'creatures') {
    const b = entry.badge;
    if (!b || typeof b !== 'object') return false;
    if (!['x', 'y', 'width'].every(k => typeof b[k] === 'number' && Number.isFinite(b[k]) && b[k] >= 0 && b[k] <= 100)) return false;
  }
  return true;
}
export async function loadCatalog(fetchImpl, baseUrl = MANIFEST_PATH) {
  let response;
  try { response = await fetchImpl(baseUrl); } catch { return {ok: false, error: 'Companion art could not be loaded. Check your connection and try again.'}; }
  if (!response || !response.ok) return {ok: false, error: NOT_READY};
  let data;
  try { data = await response.json(); } catch { return {ok: false, error: NOT_READY}; }
  if (!data || typeof data !== 'object') return {ok: false, error: NOT_READY};
  const catalog = {};
  for (const group of GROUPS) catalog[group] = (Array.isArray(data[group]) ? data[group] : []).filter(entry => validEntry(entry, group));
  catalog.missingDecorations = Array.isArray(data.missingDecorations) ? data.missingDecorations.filter(id => typeof id === 'string') : [];
  if (!catalog.creatures.length) return {ok: false, error: NOT_READY};
  return {ok: true, catalog};
}
