import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('dist/index.html', root), 'utf8');
const files = await readdir(new URL('dist/assets/', root));
const source = await readFile(new URL(`dist/assets/${files.find(file => /^index-.*\.js$/.test(file))}`, root), 'utf8');
// Stable example fixture: editing the actual portfolio must not break UI behavior tests.
const catalog = JSON.parse(await readFile(new URL('tests/fixtures/demo-portfolio.json', root), 'utf8'));
const tick = () => new Promise(resolve => setTimeout(resolve, 30));

async function boot(query = '', customCatalog = catalog) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, { url: `http://localhost:5173/portfolio/${query}`, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  window.fetch = async () => ({ ok: true, json: async () => structuredClone(customCatalog) });
  window.matchMedia = query => ({ matches: !query.includes('reduced-motion'), addEventListener() {}, removeEventListener() {} });
  window.IntersectionObserver = class { constructor(callback) { this.callback = callback; } observe(target) { this.callback([{ isIntersecting: true, target }]); } unobserve() {} disconnect() {} };
  window.HTMLDialogElement.prototype.showModal = function() { this.setAttribute('open', ''); };
  window.HTMLDialogElement.prototype.close = function() { this.removeAttribute('open'); };
  window.HTMLMediaElement.prototype.pause = function() {};
  let copied = '';
  Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async text => { copied = text; } } });
  window.eval(source);
  await tick();
  assert.equal(window.document.querySelector('#app').getAttribute('aria-busy'), 'false');
  assert.equal(window.document.querySelectorAll('.load-error').length, 0);
  return { window, document: window.document, errors, copied: () => copied, close: () => window.close() };
}

test('visitor opens a project, filters media, copies a deep link, goes back and closes', async () => {
  const page = await boot();
  try {
    const { document: doc, window } = page;
    doc.querySelector('[data-project="atlas"]').click();
    assert.ok(doc.querySelector('#project-dialog').open);
    assert.equal(new URL(window.location.href).searchParams.get('project'), 'atlas');
    doc.querySelector('[data-media-filter="video"]').click();
    assert.equal(doc.querySelectorAll('.media-card:not([hidden])').length, 2);
    doc.querySelector('[data-media="overview"]').click();
    assert.ok(doc.querySelector('#media-dialog').open);
    assert.equal(doc.querySelectorAll('video').length, 0, 'placeholder never requests an absent video');
    doc.querySelector('#media-dialog [data-copy]').click();
    await tick();
    assert.ok(page.copied().includes('project=atlas&media=overview'));
    assert.ok(doc.querySelector('#media-dialog #toast'), 'feedback stays above the active modal backdrop');
    doc.querySelector('[data-next-media]').click();
    assert.equal(new URL(window.location.href).searchParams.get('media'), 'poses');
    window.history.back();
    await tick();
    assert.ok(!doc.querySelector('#media-dialog').open);
    assert.ok(doc.querySelector('#project-dialog').open);
    assert.equal(doc.querySelectorAll('.media-card:not([hidden])').length, 2, 'project filter remains intact');
    doc.querySelector('[data-close-project]').click();
    await tick();
    assert.ok(!doc.querySelector('#project-dialog').open);
    assert.equal(window.location.search, '');
    assert.deepEqual(page.errors, []);
  } finally { page.close(); }
});

test('a direct media URL opens both layers, Escape closes each without leaving the site', async () => {
  const page = await boot('?project=kinetic&media=final');
  try {
    const { document: doc, window } = page;
    assert.ok(doc.querySelector('#project-dialog').open);
    assert.ok(doc.querySelector('#media-dialog').open);
    doc.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    assert.equal(new URL(window.location.href).searchParams.get('media'), 'keyframes');
    assert.ok(doc.querySelector('#media-dialog').contains(doc.activeElement), 'focus remains in the viewer after keyboard navigation');
    doc.querySelector('#media-dialog').dispatchEvent(new window.Event('cancel', { cancelable: true }));
    assert.ok(!doc.querySelector('#media-dialog').open);
    assert.equal(window.location.search, '?project=kinetic');
    doc.querySelector('#project-dialog').dispatchEvent(new window.Event('cancel', { cancelable: true }));
    assert.ok(!doc.querySelector('#project-dialog').open);
    assert.equal(window.location.search, '');
    assert.equal(window.location.pathname, '/portfolio/');
  } finally { page.close(); }
});

test('invalid links fall back gracefully and project filters reflect the selected category', async () => {
  const page = await boot('?project=missing&media=missing');
  try {
    const { document: doc, window } = page;
    assert.equal(window.location.search, '');
    assert.ok(!doc.querySelector('#project-dialog').open);
    doc.querySelector('[data-filter="Animation"]').click();
    assert.equal(doc.querySelectorAll('.project-card:not([hidden])').length, 1);
    assert.equal(doc.querySelector('.project-card:not([hidden]) h3').textContent, 'Kinetic');
    doc.querySelector('[data-filter="all"]').click();
    assert.equal(doc.querySelectorAll('.project-card:not([hidden])').length, 3);
  } finally { page.close(); }
});

test('adding a local video through JSON creates a lazy native player with the right path', async () => {
  const custom = structuredClone(catalog);
  custom.projects[0].media[0].src = 'media/atlas/rig-overview.mp4';
  custom.projects[0].media[0].tracks = [{ src: 'media/atlas/captions.vtt', label: 'English', language: 'en' }];
  const page = await boot('?project=atlas&media=overview', custom);
  try {
    const video = page.document.querySelector('video');
    assert.ok(video.controls);
    assert.equal(video.preload, 'metadata');
    assert.ok(!video.autoplay);
    assert.equal(video.querySelector('source').src, 'http://localhost:5173/portfolio/media/atlas/rig-overview.mp4');
    assert.equal(video.querySelector('track').srclang, 'en');
    video.querySelector('source').dispatchEvent(new page.window.Event('error'));
    assert.ok(!page.document.querySelector('.media-error').hidden);
  } finally { page.close(); }
});

test('additional photos render without changing source code and titles are escaped', async () => {
  const custom = structuredClone(catalog);
  custom.projects[0].title = '<img src=x onerror=alert(1)>';
  for (let i = 0; i < 40; i++) custom.projects[0].media.push({ ...custom.projects[0].media[1], id: `pose-${i}` });
  const page = await boot('?project=atlas', custom);
  try {
    assert.equal(page.document.querySelectorAll('.media-card').length, 44);
    assert.equal(page.document.querySelector('#project-title').textContent, '<img src=x onerror=alert(1)>');
    assert.equal(page.document.querySelectorAll('#project-title img').length, 0);
    assert.deepEqual(page.errors, []);
  } finally { page.close(); }
});
