import { getColor, capitalize } from './helpers.js';

/**
 * Creates a managed type dropdown.
 *
 * @param {object} opts
 * @param {string} opts.menuId       - id of the .type-dropdown-menu element
 * @param {string} opts.dotId        - id of the colour dot span
 * @param {string} opts.labelId      - id of the label span
 * @param {string} opts.inputId      - id of the hidden input holding the value
 * @param {boolean} [opts.fixed]     - if true, positions menu via getBoundingClientRect (edit panel)
 */
export function createTypeDropdown({ menuId, dotId, labelId, inputId, fixed = false }) {
  let isOpen = false;

  const menuEl  = () => document.getElementById(menuId);
  const dotEl   = () => document.getElementById(dotId);
  const labelEl = () => document.getElementById(labelId);
  const inputEl = () => document.getElementById(inputId);

  function select(value) {
    inputEl().value           = value;
    dotEl().style.background  = getColor(value);
    labelEl().textContent     = capitalize(value);
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
      const rect      = e.currentTarget.getBoundingClientRect();
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

  return { select, toggle, close, getValue, isOpen: () => isOpen };
}
