// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { STEPS } from '../../js/tutorial.js';

// ── STEPS data integrity ──────────────────────────────────────────────────────

describe('STEPS array', () => {
  it('has 10 steps', () => {
    expect(STEPS).toHaveLength(10);
  });

  it('every step has a non-empty title string', () => {
    for (const [i, step] of STEPS.entries()) {
      expect(typeof step.title, `step ${i} title`).toBe('string');
      expect(step.title.length, `step ${i} title`).toBeGreaterThan(0);
    }
  });

  it('every step has a non-empty body string', () => {
    for (const [i, step] of STEPS.entries()) {
      expect(typeof step.body, `step ${i} body`).toBe('string');
      expect(step.body.length, `step ${i} body`).toBeGreaterThan(0);
    }
  });

  it('all step titles are unique', () => {
    const titles = STEPS.map(s => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('first and last steps have no targetFn (intro / outro)', () => {
    expect(STEPS[0].targetFn).toBeUndefined();
    expect(STEPS[STEPS.length - 1].targetFn).toBeUndefined();
  });

  it('middle steps all have a targetFn function', () => {
    const middle = STEPS.slice(1, -1);
    for (const [i, step] of middle.entries()) {
      expect(typeof step.targetFn, `middle step ${i + 1} targetFn`).toBe('function');
    }
  });

  it('isSVG is only set on the "You" node step (index 1)', () => {
    expect(STEPS[1].isSVG).toBe(true);
    const others = [...STEPS.slice(0, 1), ...STEPS.slice(2)];
    for (const [i, step] of others.entries()) {
      expect(step.isSVG, `step ${i} should not have isSVG`).toBeFalsy();
    }
  });

  it('no step has both target and targetFn defined simultaneously', () => {
    for (const [i, step] of STEPS.entries()) {
      const hasBoth = 'target' in step && step.target !== null && 'targetFn' in step;
      expect(hasBoth, `step ${i} has conflicting target + targetFn`).toBe(false);
    }
  });
});

// ── DOM behaviour ─────────────────────────────────────────────────────────────

function setupDOM() {
  document.body.innerHTML = `
    <div id="tutorial-dim"></div>
    <div id="tutorial-card"></div>
    <div id="panel"></div>
    <div id="legend"></div>
    <div id="nb-link"></div>
    <div id="side-panel"></div>
    <div id="io-bar"></div>
    <svg id="svg">
      <g class="node-group" data-node-id="me"></g>
    </svg>
  `;
}

describe('startTutorial / closeTutorial', () => {
  beforeEach(() => {
    setupDOM();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('startTutorial makes the dim overlay visible', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    expect(document.getElementById('tutorial-dim').classList.contains('visible')).toBe(true);
  });

  it('startTutorial makes the tutorial card visible', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    expect(document.getElementById('tutorial-card').classList.contains('visible')).toBe(true);
  });

  it('startTutorial renders step 1 badge text', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    const card = document.getElementById('tutorial-card');
    expect(card.innerHTML).toContain('Step 1 of 10');
  });

  it('startTutorial renders the first step title', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    const card = document.getElementById('tutorial-card');
    expect(card.innerHTML).toContain(STEPS[0].title);
  });

  it('closeTutorial removes visible class from the dim overlay', async () => {
    const { startTutorial, closeTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    closeTutorial();
    expect(document.getElementById('tutorial-dim').classList.contains('visible')).toBe(false);
  });

  it('closeTutorial removes visible class from the card', async () => {
    const { startTutorial, closeTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    closeTutorial();
    expect(document.getElementById('tutorial-card').classList.contains('visible')).toBe(false);
  });

  it('closeTutorial strips highlight classes from any highlighted element', async () => {
    const { startTutorial, closeTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    // advance to step with a DOM target so something gets highlighted
    document.querySelector('#tut-next-btn')?.click();
    document.querySelector('#tut-next-btn')?.click(); // step 3: #panel
    closeTutorial();
    expect(document.getElementById('panel').classList.contains('tutorial-highlight')).toBe(false);
  });
});

describe('Next / Back navigation', () => {
  beforeEach(() => {
    setupDOM();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clicking Next advances to step 2', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    document.querySelector('#tut-next-btn').click();
    expect(document.getElementById('tutorial-card').innerHTML).toContain('Step 2 of 10');
  });

  it('step 2 renders the correct title', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    document.querySelector('#tut-next-btn').click();
    expect(document.getElementById('tutorial-card').innerHTML).toContain(STEPS[1].title);
  });

  it('Back button is absent on step 1', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    expect(document.getElementById('tut-prev-btn')).toBeNull();
  });

  it('Back button is present on step 2', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    document.querySelector('#tut-next-btn').click();
    expect(document.getElementById('tut-prev-btn')).not.toBeNull();
  });

  it('clicking Back from step 2 returns to step 1', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    document.querySelector('#tut-next-btn').click();
    document.querySelector('#tut-prev-btn').click();
    expect(document.getElementById('tutorial-card').innerHTML).toContain('Step 1 of 10');
  });

  it('Next button label is "Finish" on the last step', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    // advance to last step
    for (let i = 0; i < STEPS.length - 1; i++) {
      document.querySelector('#tut-next-btn').click();
    }
    expect(document.querySelector('#tut-next-btn').textContent).toBe('Finish');
  });

  it('clicking Finish on the last step closes the tutorial', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    for (let i = 0; i < STEPS.length - 1; i++) {
      document.querySelector('#tut-next-btn').click();
    }
    document.querySelector('#tut-next-btn').click(); // Finish
    expect(document.getElementById('tutorial-card').classList.contains('visible')).toBe(false);
  });
});

describe('Progress pips', () => {
  beforeEach(() => {
    setupDOM();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders 10 pips', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    const pips = document.querySelectorAll('.tut-pip');
    expect(pips).toHaveLength(10);
  });

  it('first pip is done on step 1', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    const pips = document.querySelectorAll('.tut-pip');
    expect(pips[0].classList.contains('done')).toBe(true);
    expect(pips[1].classList.contains('done')).toBe(false);
  });

  it('two pips are done on step 2', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    document.querySelector('#tut-next-btn').click();
    const pips = document.querySelectorAll('.tut-pip');
    expect(pips[0].classList.contains('done')).toBe(true);
    expect(pips[1].classList.contains('done')).toBe(true);
    expect(pips[2].classList.contains('done')).toBe(false);
  });
});

describe('Highlight behaviour', () => {
  beforeEach(() => {
    setupDOM();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('the "You" SVG node gets tutorial-highlight-svg on step 2', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    document.querySelector('#tut-next-btn').click(); // → step 2
    const meNode = document.querySelector('.node-group[data-node-id="me"]');
    expect(meNode.classList.contains('tutorial-highlight-svg')).toBe(true);
  });

  it('#panel gets tutorial-highlight on step 3', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    document.querySelector('#tut-next-btn').click();
    document.querySelector('#tut-next-btn').click(); // → step 3
    expect(document.getElementById('panel').classList.contains('tutorial-highlight')).toBe(true);
  });

  it('advancing to a new step removes the previous highlight', async () => {
    const { startTutorial } = await import('../../js/tutorial.js');
    startTutorial();
    document.querySelector('#tut-next-btn').click(); // → step 2 (SVG highlight)
    document.querySelector('#tut-next-btn').click(); // → step 3
    const meNode = document.querySelector('.node-group[data-node-id="me"]');
    expect(meNode.classList.contains('tutorial-highlight-svg')).toBe(false);
  });
});
