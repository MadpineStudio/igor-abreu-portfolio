import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { readRoute, routeUrl } from '../src/routing.ts';
import { safeUrl, escapeHtml, mediaLabel } from '../src/utils.ts';

test('project and media links survive being opened directly and retain hosting subpaths', () => {
  const url = routeUrl('https://example.com/portfolio/?ref=friend#work', { project: 'atlas', media: 'deformation' });
  assert.equal(url.pathname, '/portfolio/');
  assert.equal(url.searchParams.get('ref'), 'friend');
  assert.equal(url.hash, '');
  assert.deepEqual(readRoute(new URL(url.href)), { project: 'atlas', media: 'deformation' });
});

test('closing a media preserves the project; closing a project clears both selections', () => {
  const media = new URL('https://example.com/?projeto=atlas&midia=overview&ref=friend');
  assert.deepEqual(readRoute(media), { project: 'atlas', media: 'overview' });
  const project = routeUrl(media, { project: 'atlas', media: null });
  assert.deepEqual(readRoute(project), { project: 'atlas', media: null });
  assert.equal(project.searchParams.get('project'), 'atlas');
  assert.ok(!project.searchParams.has('projeto') && !project.searchParams.has('midia'));
  const home = routeUrl(project, { project: null, media: 'orphan' });
  assert.deepEqual(readRoute(home), { project: null, media: null });
  assert.equal(home.searchParams.get('ref'), 'friend');
});

test('local paths work in a subdirectory and unsafe URL schemes are rejected', () => {
  assert.equal(safeUrl('media/atlas/walk cycle.mp4', 'https://example.com/portfolio/'), 'https://example.com/portfolio/media/atlas/walk%20cycle.mp4');
  assert.equal(safeUrl('', 'https://example.com/'), '');
  assert.equal(safeUrl('javascript:alert(1)', 'https://example.com/'), '');
  assert.equal(safeUrl('data:text/html,<script>evil()</script>', 'https://example.com/'), '');
  assert.equal(escapeHtml('a "rig" <b> & \'motion\''), 'a &quot;rig&quot; &lt;b&gt; &amp; &#39;motion&#39;');
});

test('the shipped JSON has valid projects, unique links, and existing local media', async () => {
  const root = new URL('../public/', import.meta.url);
  const portfolio = JSON.parse(await readFile(new URL('portfolio.json', root), 'utf8'));
  assert.ok(portfolio.projects.length > 0);
  assert.equal(new Set(portfolio.projects.map(project => project.id)).size, portfolio.projects.length);
  assert.ok(portfolio.profile.name);
  await access(new URL(portfolio.profile.heroImage, root));
  for (const image of portfolio.profile.heroImages ?? []) {
    assert.ok(image.alt);
    await access(new URL(image.src, root));
    await access(new URL(image.src, new URL('../dist/', import.meta.url)));
  }
  const schema = JSON.parse(await readFile(new URL('portfolio.schema.json', root), 'utf8'));
  assert.ok(schema.properties.profile.properties.name);
  for (const project of portfolio.projects) {
    assert.match(project.id, /^[a-z0-9-]+$/);
    assert.equal(new Set(project.media.map(media => media.id)).size, project.media.length);
    await access(new URL(project.cover, root));
    for (const media of project.media) {
      assert.ok(['image', 'video'].includes(media.type));
      assert.ok(media.title && media.alt);
      await access(new URL(media.poster, root));
      if (media.src && !media.src.startsWith('http')) await access(new URL(media.src, root));
    }
  }
});

test('media counts work for large galleries and singular content', () => {
  assert.equal(mediaLabel(1, 1), '1 video · 1 image');
  assert.equal(mediaLabel(48, 15), '15 videos · 48 images');
  assert.equal(mediaLabel(0, 3), '3 videos');
});
