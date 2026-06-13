import { getColor, capitalize } from './helpers.js';
import { RELATIONSHIP_TYPES } from './constants.js';

// Single source of truth: option rows are built from RELATIONSHIP_TYPES +
// TYPE_COLORS rather than hardcoded in the markup.
function optionsHTML() {
  return RELATIONSHIP_TYPES.map(t =>
    `<div class="td-option" data-value="${t}">` +
      `<span class="td-dot" style="background:${getColor(t)}"></span>${capitalize(t)}` +
    `</div>`
  ).join('');
}

/**
 * Creates a managed type dropdown that renders its own options and wires its own
 * click handlers (button toggle + option select via event delegation).
 *
 * @param {object} opts
 * @param {string} opts.btnId    - id of the .type-dropdown-btn trigger button
 * @param {string} opts.menuId   - id of the .type-dropdown-menu element
 * @param {string} opts.dotId    - id of the colour dot span in the button
 * @param {string} opts.labelId  - id of the label span in the button
 * @param {string} opts.inputId  - id of the hidden input holding the value
 * @param {boolean} [opts.fixed] - if true, positions the menu via getBoundingClientRect (edit panel)
 */
export function createTypeDropdown({ btnId, menuId, dotId, labelId, inputId, fixed = false }) {
  let isOpen = false;

  const btnEl   = () => document.getElementById(btnId);
  const menuEl  = () => document.getElementById(menuId);
  const dotEl   = () => document.getElementById(dotId);
  const labelEl = () => document.getElementById(labelId);
  const inputEl = () => document.getElementById(inputId);

  menuEl().innerHTML = optionsHTML();

  function select(value) {
    inputEl().value          = value;
    dotEl().style.background = getColor(value);
    labelEl().textContent    = capitalize(value);
    menuEl().querySelectorAll('.td-option').forEach(o =>
      o.classList.toggle('selected', o.dataset.value === value)
    );
    close();
  }

  function toggle(e) {
    e.stopPropagation();
    isOpen = !isOpen;
    menuEl().classList.toggle('open', isOpen);
    if (isOpen && fixed) {
      const rect = e.currentTarget.getBoundingClientRect();
      menuEl().style.top  = (rect.bottom + 6) + 'px';
      menuEl().style.left = rect.left + 'px';
    }
  }

  function close() {
    isOpen = false;
    menuEl().classList.remove('open');
  }

  function getValue() {
    return inputEl().value;
  }

  // Self-wiring — keeps all event handling out of the markup.
  btnEl().addEventListener('click', toggle);
  menuEl().addEventListener('click', e => {
    const opt = e.target.closest('.td-option');
    if (opt) { e.stopPropagation(); select(opt.dataset.value); }
  });

  // Default to the first type so the button reflects the constants on load.
  select(RELATIONSHIP_TYPES[0]);

  return { select, toggle, close, getValue, isOpen: () => isOpen };
}
