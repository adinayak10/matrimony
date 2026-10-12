// bindFilters(formEl, onChange, { debounce, defaults }) → { values, set, clear, params }
// Serialises the form's named controls to URLSearchParams, mirrors them into
// the address bar (history.replaceState) so a filtered list is deep-linkable,
// and restores them from the URL on load. Text inputs are debounced; selects
// fire immediately. A [data-filter-clear] button resets everything.
//
// onChange(values) is called once on bind (with restored values) and on every change.

function controls(form) {
  return Array.from(form.elements).filter((f) => f.name && !f.disabled && f.type !== 'submit' && f.type !== 'button');
}

export function bindFilters(form, onChange, { debounce = 300, defaults = {}, syncUrl = true, ignore = ['page'] } = {}) {
  if (!form) return { values: () => ({}), set() {}, clear() {}, params: () => new URLSearchParams() };

  const read = () => {
    const out = {};
    for (const f of controls(form)) {
      const v = f.type === 'checkbox' ? (f.checked ? (f.value || '1') : '') : String(f.value || '').trim();
      if (v !== '') out[f.name] = v;
    }
    return out;
  };

  const write = (values) => {
    for (const f of controls(form)) {
      const v = values[f.name];
      if (f.type === 'checkbox') f.checked = v != null && v !== '' && v !== '0' && v !== 'false';
      else f.value = v == null ? '' : String(v);
    }
  };

  const mirror = (values) => {
    if (!syncUrl) return;
    const url = new URL(location.href);
    const keep = new URLSearchParams();
    for (const [k, v] of url.searchParams) if (ignore.includes(k)) keep.set(k, v);
    const next = new URLSearchParams(keep);
    for (const [k, v] of Object.entries(values)) {
      if (v !== '' && v != null && String(v) !== String(defaults[k] ?? '')) next.set(k, String(v));
    }
    url.search = next.toString();
    history.replaceState(history.state, '', url);
  };

  let timer = null;
  const emit = () => {
    const values = read();
    mirror(values);
    onChange(values);
  };
  const emitDebounced = () => { clearTimeout(timer); timer = setTimeout(emit, debounce); };

  // Restore: defaults first, then whatever the URL says.
  const fromUrl = {};
  for (const [k, v] of new URL(location.href).searchParams) if (!ignore.includes(k)) fromUrl[k] = v;
  write({ ...defaults, ...fromUrl });

  for (const f of controls(form)) {
    if (f.tagName === 'SELECT' || f.type === 'checkbox' || f.type === 'radio' || f.type === 'date') f.addEventListener('change', emit);
    else { f.addEventListener('input', emitDebounced); f.addEventListener('search', emit); }
  }
  form.addEventListener('submit', (ev) => { ev.preventDefault(); clearTimeout(timer); emit(); });
  const clearBtn = form.querySelector('[data-filter-clear]');
  if (clearBtn) clearBtn.addEventListener('click', () => { write(defaults); emit(); });

  onChange(read());

  return {
    values: read,
    set(values) { write({ ...read(), ...values }); emit(); },
    clear() { write(defaults); emit(); },
    params() { return new URLSearchParams(read()); },
  };
}

export default bindFilters;
