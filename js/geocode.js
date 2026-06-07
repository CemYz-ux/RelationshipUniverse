const cache = new Map();

export async function searchCities(query) {
  const key = query.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key);

  try {
    const res  = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`,
      { headers: { 'User-Agent': 'Polymaps/1.0 (https://polymaps.app)' } }
    );
    const data = await res.json();
    const results = (data.features || []).map(f => {
      const p    = f.properties;
      const name = p.name || p.city || p.state || '';
      const ctx  = [p.state !== name && p.state, p.country].filter(Boolean).join(', ');
      const [lng, lat] = f.geometry.coordinates;
      return { name, ctx, lat, lng };
    }).filter(r => r.name);
    cache.set(key, results);
    return results;
  } catch {
    return [];
  }
}

// Attaches city-search autocomplete to an input element.
// dropdownEl: an empty div that will become the suggestion list
// onSelect({ lat, lng, name } | null): called when user picks a result or clears
export function attachCitySearch(inputEl, dropdownEl, onSelect) {
  let timer      = null;
  let activeIdx  = -1;

  function close() {
    dropdownEl.innerHTML = '';
    dropdownEl.classList.remove('open');
    activeIdx = -1;
  }

  function pick(item) {
    inputEl.value = item.name;
    onSelect({ lat: item.lat, lng: item.lng, name: item.name });
    close();
  }

  function setActive(items, idx) {
    activeIdx = idx;
    items.forEach((el, i) => el.classList.toggle('city-item-active', i === idx));
  }

  function renderItems(items) {
    dropdownEl.innerHTML = '';
    if (!items.length) { close(); return; }
    items.forEach(item => {
      const el  = document.createElement('div');
      el.className = 'city-item';
      el.innerHTML = `<span class="city-item-name">${item.name}</span>`
                   + (item.ctx ? `<span class="city-item-ctx">${item.ctx}</span>` : '');
      el.addEventListener('mousedown', e => { e.preventDefault(); pick(item); });
      dropdownEl.appendChild(el);
    });
    dropdownEl.classList.add('open');
    activeIdx = -1;
  }

  inputEl.addEventListener('input', () => {
    clearTimeout(timer);
    onSelect(null); // clear stored geocode on any manual edit
    const val = inputEl.value.trim();
    if (val.length < 2) { close(); return; }
    timer = setTimeout(async () => {
      const results = await searchCities(val);
      if (inputEl.value.trim() !== val) return;
      renderItems(results);
    }, 300);
  });

  inputEl.addEventListener('keydown', e => {
    const items = Array.from(dropdownEl.querySelectorAll('.city-item'));
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(items, Math.min(activeIdx + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(items, Math.max(activeIdx - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      e.stopImmediatePropagation(); // prevent the add-person Enter listener from firing
      items[activeIdx].dispatchEvent(new MouseEvent('mousedown'));
    } else if (e.key === 'Escape') {
      close();
    }
  });

  // Close on blur with a delay so mousedown on an item fires first
  inputEl.addEventListener('blur', () => setTimeout(close, 160));
}
