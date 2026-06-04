const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

let viewYear  = new Date().getFullYear();
let viewMonth = new Date().getMonth();

export function initDatePicker() {
  document.getElementById('std-date-display').addEventListener('click', e => {
    e.stopPropagation();
    togglePicker();
  });

  // Sync text input → picker view on blur; normalize if valid
  document.getElementById('edit-std-date').addEventListener('blur', () => {
    const val = document.getElementById('edit-std-date').value.trim();
    if (!val) return;
    const d = parseDateStr(val);
    if (d) {
      const iso = toISO(d);
      document.getElementById('edit-std-date').value = iso;
      viewYear  = d.getFullYear();
      viewMonth = d.getMonth();
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#std-date-picker')) closePicker();
  });
}

export function setPickerDate(dateStr) {
  document.getElementById('edit-std-date').value = dateStr || '';
  if (dateStr) {
    const d = parseDateStr(dateStr);
    if (d) { viewYear = d.getFullYear(); viewMonth = d.getMonth(); }
  } else {
    viewYear  = new Date().getFullYear();
    viewMonth = new Date().getMonth();
  }
}

function togglePicker() {
  const dd = document.getElementById('cdp-dropdown');
  if (dd.classList.contains('open')) { closePicker(); } else { renderCalendar(); dd.classList.add('open'); }
}

function closePicker() {
  document.getElementById('cdp-dropdown')?.classList.remove('open');
}

function parseDateStr(str) {
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
  return isNaN(d) ? null : d;
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function renderCalendar() {
  const dd          = document.getElementById('cdp-dropdown');
  const selectedVal = document.getElementById('edit-std-date').value.trim();
  const today       = new Date();
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  let html = `
    <div class="cdp-header">
      <button type="button" class="cdp-nav" onclick="cdpPrevMonth()">&#8249;</button>
      <span class="cdp-month-label">${MONTHS[viewMonth]} ${viewYear}</span>
      <button type="button" class="cdp-nav" onclick="cdpNextMonth()">&#8250;</button>
    </div>
    <div class="cdp-grid">
      ${DAYS.map(d => `<div class="cdp-day-name">${d}</div>`).join('')}
  `;

  for (let i = 0; i < firstDay; i++) html += `<div></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = ds === selectedVal;
    const isToday    = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
    let cls = 'cdp-day';
    if (isSelected) cls += ' selected';
    else if (isToday) cls += ' today';
    html += `<div class="${cls}" onclick="cdpSelectDay('${ds}')">${day}</div>`;
  }

  html += `</div>`;
  if (selectedVal) {
    html += `<button type="button" class="cdp-clear" onclick="cdpClearDate()">✕ Clear date</button>`;
  }

  dd.innerHTML = html;
}

window.cdpPrevMonth = () => {
  if (--viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
};
window.cdpNextMonth = () => {
  if (++viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
};
window.cdpSelectDay = dateStr => {
  document.getElementById('edit-std-date').value = dateStr;
  closePicker();
};
window.cdpClearDate = () => {
  document.getElementById('edit-std-date').value = '';
  renderCalendar();
};
