// Hero's Journey tutorial for Polymaps

export const STEPS = [
  {
    title: 'The Universe Awaits',
    body: 'Welcome to Polymaps — an interactive map of the people in your life. This quick tour will show you everything you need to know.',
    target: null,
  },
  {
    title: 'The Center of Your World',
    body: 'The white node at the center is <em>you</em>. Click it, then tap ✎ to open your profile and give yourself a name.',
    targetFn: () => document.querySelector('.node-group[data-node-id="me"]'),
    isSVG: true,
  },
  {
    title: 'Add Your People',
    body: 'Use the bar at the bottom to add someone in your life. Type their name, pick a relationship type, and hit <strong>+ Add</strong>.',
    targetFn: () => document.getElementById('panel'),
  },
  {
    title: 'Forge Connections',
    body: 'Click any node, then tap <strong>⇌</strong> to enter link mode — then click another node to connect them. Every relationship leaves a thread.',
    targetFn: () => document.getElementById('nb-link'),
  },
  {
    title: 'Merge & Simplify',
    body: 'Click any node, then tap <strong>⊕</strong> to enter merge mode — then click another node to absorb it. Its connections all move across. The <strong>You</strong> node can absorb others but can never be removed.',
    targetFn: () => document.getElementById('nb-merge'),
  },
  {
    title: 'The Language of Colour',
    body: 'Each hue tells a story: lavender for partners, pink for friends, teal for dating, and more. The colour shows on their node instantly.',
    targetFn: () => document.getElementById('legend'),
  },
  {
    title: 'Track Your Health',
    body: 'Open any node\'s edit panel and log a <strong>Last STD tested</strong> date. A ring glows green (recent), amber (6+ months), or red (1+ year).',
    targetFn: () => document.getElementById('side-panel'),
  },
  {
    title: 'Untangle the Web',
    body: 'Nodes getting crowded? Hit <strong>⊹ Untangle</strong> to snap everything into a clean radial layout — connected people placed side by side, you at the centre.',
    targetFn: () => document.querySelector('button[onclick="untangleNodes()"]'),
  },
  {
    title: 'Share Your Universe',
    body: 'Hit <strong>Share</strong> to copy a compressed link, or <strong>QR</strong> to generate a scannable code. Others can import your network and merge it with theirs.',
    targetFn: () => document.getElementById('io-bar'),
  },
  {
    title: 'The Adventure Begins',
    body: 'You\'re all set. Your universe saves automatically and lives only on your device — private by default, shareable when you choose.',
    target: null,
  },
];

let currentStep = -1;
let highlightedEl = null;

function getCard()   { return document.getElementById('tutorial-card'); }
function getDim()    { return document.getElementById('tutorial-dim'); }

export function startTutorial() {
  currentStep = 0;
  getDim().classList.add('visible');
  render();
}

export function closeTutorial() {
  currentStep = -1;
  clearHighlight();
  getDim().classList.remove('visible');
  getCard().classList.remove('visible');
}

function nextStep() {
  if (currentStep < STEPS.length - 1) { currentStep++; render(); }
  else closeTutorial();
}

function prevStep() {
  if (currentStep > 0) { currentStep--; render(); }
}

function clearHighlight() {
  if (!highlightedEl) return;
  if (highlightedEl._isSVG) {
    highlightedEl.el.classList.remove('tutorial-highlight-svg');
  } else {
    highlightedEl.el.classList.remove('tutorial-highlight');
  }
  highlightedEl = null;
}

function render() {
  const step = STEPS[currentStep];
  const card = getCard();
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  // Clear previous highlight
  clearHighlight();

  // Apply new highlight
  let targetEl = null;
  if (step.targetFn) {
    targetEl = step.targetFn();
    if (targetEl) {
      const cls = step.isSVG ? 'tutorial-highlight-svg' : 'tutorial-highlight';
      targetEl.classList.add(cls);
      highlightedEl = { el: targetEl, _isSVG: step.isSVG };
    }
  }

  // Build card HTML
  const pips = STEPS.map((_, i) =>
    `<div class="tut-pip${i <= currentStep ? ' done' : ''}"></div>`
  ).join('');

  card.innerHTML = `
    <div class="tut-step-badge">
      <span>Step ${currentStep + 1} of ${STEPS.length}</span>
      <button class="tut-step-close" id="tut-close-btn" title="Close tutorial">✕</button>
    </div>
    <p class="tut-title">${step.title}</p>
    <p class="tut-body">${step.body}</p>
    <div class="tut-actions">
      <div class="tut-progress">${pips}</div>
      ${!isFirst ? '<button class="tut-btn" id="tut-prev-btn">← Back</button>' : ''}
      <button class="tut-btn tut-btn-primary" id="tut-next-btn">${isLast ? 'Finish' : 'Next →'}</button>
    </div>
  `;

  card.classList.add('visible');

  // Wire buttons
  document.getElementById('tut-close-btn').addEventListener('click', closeTutorial);
  document.getElementById('tut-next-btn').addEventListener('click', nextStep);
  if (!isFirst) document.getElementById('tut-prev-btn').addEventListener('click', prevStep);

  // Position card
  positionCard(card, targetEl, step.isSVG);
}

function positionCard(card, targetEl, isSVG) {
  // Temporarily show to measure
  card.style.top = '';
  card.style.bottom = '';
  card.style.left = '';
  card.style.right = '';
  card.style.transform = '';

  if (!targetEl) {
    // Center of viewport
    card.style.top = '50%';
    card.style.left = '50%';
    card.style.transform = 'translate(-50%, -50%)';
    return;
  }

  const rect = targetEl.getBoundingClientRect();
  const cardW = 300;
  const cardH = 200; // approximate
  const gap = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Prefer placing below if target is in top half, above otherwise
  const targetCenterY = rect.top + rect.height / 2;
  const placeBelow = targetCenterY < vh / 2;

  // Horizontal: center on target, clamp to viewport
  let left = rect.left + rect.width / 2 - cardW / 2;
  left = Math.max(16, Math.min(left, vw - cardW - 16));

  if (placeBelow) {
    const top = Math.min(rect.bottom + gap, vh - cardH - 16);
    card.style.top  = top + 'px';
  } else {
    const bottom = Math.min(vh - rect.top + gap, vh - 16);
    card.style.bottom = bottom + 'px';
  }

  card.style.left = left + 'px';
}

// Expose for inline HTML onclick
window.startTutorial = startTutorial;
