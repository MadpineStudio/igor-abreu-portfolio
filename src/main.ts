import './style.css';
import type { Media, Portfolio, Project } from './types';
import { readRoute, routeUrl } from './routing';
import { escapeHtml as e, mediaLabel, safeUrl } from './utils';
import { initMotion } from './motion';
import { initHeroCarousel } from './hero';

const app = document.querySelector<HTMLDivElement>('#app')!;
const projectDialog = document.querySelector<HTMLDialogElement>('#project-dialog')!;
const mediaDialog = document.querySelector<HTMLDialogElement>('#media-dialog')!;
const toastElement = document.querySelector<HTMLElement>('#toast')!;
const base = new URL(import.meta.env.BASE_URL, location.href).href;
const asset = (path: string) => e(safeUrl(path, base));
let data: Portfolio;
let activeProject: Project | undefined;
let lastTrigger: HTMLElement | null = null;
let toastTimer = 0;
let mediaFilter = 'all';
const arrow = '<span aria-hidden="true">↗</span>';

function toast(message: string) {
  const root = mediaDialog.open ? mediaDialog : projectDialog.open ? projectDialog : document.body;
  root.append(toastElement);
  toastElement.textContent = message;
  toastElement.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toastElement.classList.remove('is-visible'); }, 3200);
}

function stats(project: Project) {
  return mediaLabel(project.media.filter(m => m.type === 'image').length, project.media.filter(m => m.type === 'video').length);
}

function renderHome() {
  const { profile, projects } = data;
  const heroImages = profile.heroImages?.length ? profile.heroImages : [{ src: profile.heroImage, alt: profile.heroAlt }];
  const categories = [...new Set(projects.map(project => project.category))];
  document.title = `${profile.name} — ${profile.role}`;
  app.innerHTML = `
    <header class="site-header">
      <a class="wordmark" href="#home" aria-label="${e(profile.name)}, home">${e(profile.name)}</a>
      <nav aria-label="Main navigation">
        <a href="#work">Work</a>
        ${profile.email ? `<a href="mailto:${e(encodeURIComponent(profile.email))}">Contact</a>` : ''}
      </nav>
    </header>
    <main>
      <section id="home" class="hero" aria-labelledby="hero-title">
        <div class="hero-art"><img class="hero-image" src="${asset(heroImages[0].src)}" alt="${e(heroImages[0].alt)}" fetchpriority="high" width="1920" height="1080" /></div>
        <div class="hero-shade"></div>
        <div class="hero-content page-width">
          <h1 id="hero-title">${e(profile.role)}</h1>
          <div class="hero-actions">
            <a class="hero-link" href="#work">View work <span aria-hidden="true">↓</span></a>
            ${heroImages.length > 1 ? `<div class="hero-controls" role="group" aria-label="Background images"><button type="button" data-hero-previous aria-label="Previous background"><span aria-hidden="true">←</span></button><span data-hero-position aria-live="polite" aria-atomic="true">01 / ${String(heroImages.length).padStart(2, '0')}</span><button type="button" data-hero-next aria-label="Next background"><span aria-hidden="true">→</span></button></div>` : ''}
          </div>
        </div>
      </section>
      <section id="work" class="work page-width" aria-labelledby="work-title">
        <div class="section-intro" data-reveal><h2 id="work-title">Selected work</h2></div>
        <div class="gallery-toolbar" data-reveal>
          <div class="filters" aria-label="Filter projects"><button class="filter is-active" type="button" data-filter="all" aria-pressed="true">All</button>${categories.map(category => `<button class="filter" type="button" data-filter="${e(category)}" aria-pressed="false">${e(category)}</button>`).join('')}</div>
        </div>
        <div class="project-grid">${projects.map((project, index) => `
          <article class="project-card" data-category="${e(project.category)}" data-reveal style="--reveal-delay: ${index * 80}ms">
            <a href="${e(routeUrl(location.href, { project: project.id, media: null }).pathname + routeUrl(location.href, { project: project.id, media: null }).search)}" class="project-link" data-project="${e(project.id)}" aria-label="View ${e(project.title)}, ${e(stats(project))}">
              <div class="project-visual" data-cursor>
                <img src="${asset(project.cover)}" alt="${e(project.coverAlt)}" width="1200" height="950" loading="lazy" />
              </div>
              <div class="project-info"><h3>${e(project.title)}</h3><p>${e(project.category)}</p></div>
            </a>
          </article>`).join('')}</div>
        <p id="project-count" class="visually-hidden" aria-live="polite">${projects.length} projects</p>
      </section>
    </main>
    <footer class="site-footer">
      <div class="page-width footer-bottom">
        <p>© ${new Date().getFullYear()} ${e(profile.name)}</p>
        <div class="footer-links">${profile.email ? `<a href="mailto:${e(encodeURIComponent(profile.email))}">${e(profile.email)}</a>` : ''}${profile.socials.map(social => `<a href="${asset(social.url)}" target="_blank" rel="noopener noreferrer">${e(social.label)}</a>`).join('')}<a href="#home">Back to top ↑</a></div>
      </div>
    </footer>`;
  app.setAttribute('aria-busy', 'false');
  initMotion();
  initHeroCarousel(heroImages, base, () => toast('Unable to load this background. Try again.'));
}

function renderProject(project: Project) {
  mediaFilter = 'all';
  projectDialog.innerHTML = `
    <div class="project-shell">
      <header class="modal-header"><a href="${e(routeUrl(location.href, { project: null, media: null }).pathname)}" class="modal-back" data-close-project><span aria-hidden="true">←</span> All projects</a><div><button class="copy-link text-button" type="button" data-copy>Copy link ${arrow}</button><button class="close-button" type="button" data-close-project aria-label="Close project"><span aria-hidden="true">×</span></button></div></header>
      <div class="project-body">
        <div class="project-heading"><div><p class="eyebrow section-kicker">${e(project.category)}</p><h2 id="project-title" tabindex="-1">${e(project.title)}</h2></div><div class="project-description"><p>${e(project.description)}</p><dl><div><dt>Tools</dt><dd>${project.tools.map(e).join(' / ')}</dd></div><div><dt>Year</dt><dd>${e(project.year)}</dd></div></dl></div></div>
        <div class="media-toolbar"><h3>Gallery <span>${String(project.media.length).padStart(2, '0')}</span></h3><div class="filters" aria-label="Filter media"><button type="button" class="filter is-active" data-media-filter="all" aria-pressed="true">All</button><button type="button" class="filter" data-media-filter="video" aria-pressed="false">Videos</button><button type="button" class="filter" data-media-filter="image" aria-pressed="false">Images</button></div></div>
        <div class="media-grid">${project.media.map((media, index) => mediaCard(project, media, index)).join('')}</div>
        <p class="empty-media" hidden>No media of this type.</p>
        ${project.credits ? `<p class="project-credits">${e(project.credits)}</p>` : ''}
        <button class="next-project" type="button" data-next-project><span>Next project</span><strong>${e(data.projects[(data.projects.indexOf(project) + 1) % data.projects.length].title)} ${arrow}</strong></button>
      </div>
    </div>`;
  projectDialog.scrollTop = 0;
}

function mediaCard(project: Project, media: Media, index: number): string {
  const thumb = media.type === 'image' ? media.poster || media.src : media.poster;
  return `<a class="media-card media-${e(media.aspect ?? (index === 0 ? 'wide' : 'square'))}" href="${e(routeUrl(location.href, { project: project.id, media: media.id }).href)}" data-media="${e(media.id)}" data-media-type="${media.type}" aria-label="Open ${e(media.title)}${media.type === 'video' ? ', video' : ', image'}">
    <div class="media-thumb"><img src="${asset(thumb)}" alt="${e(media.alt)}" width="1200" height="950" loading="lazy" />${media.type === 'video' ? '<span class="play-button" aria-hidden="true"><span></span></span>' : '<span class="expand-button" aria-hidden="true">↗</span>'}${!media.src ? '<span class="placeholder-label">Placeholder</span>' : ''}<span class="media-kind">${media.type === 'video' ? 'Video' : 'Image'}</span></div>
    <div class="media-card-caption"><h4>${e(media.title)}</h4></div></a>`;
}

function renderMedia(project: Project, media: Media) {
  pauseVideos(mediaDialog);
  const index = project.media.indexOf(media);
  let content: string;
  if (media.type === 'video' && media.src) {
    content = `<video controls playsinline preload="metadata" poster="${asset(media.poster)}" aria-label="${e(media.title)}"><source src="${asset(media.src)}" />${(media.tracks ?? []).map(track => `<track kind="captions" src="${asset(track.src)}" srclang="${e(track.language)}" label="${e(track.label)}" />`).join('')}Your browser does not support this video.</video><p class="media-error" hidden>Unable to load this video.</p>`;
  } else {
    content = `<img src="${asset(media.src || media.poster)}" alt="${e(media.alt)}" />${!media.src ? `<div class="placeholder-message">${media.type === 'video' ? '<span class="placeholder-play" aria-hidden="true">▷</span>' : ''}<strong>${media.type === 'video' ? 'Video placeholder' : 'Image placeholder'}</strong><span></span></div>` : ''}`;
  }
  mediaDialog.innerHTML = `<div class="viewer-shell"><header class="viewer-header"><div><span>${e(project.title)} /</span><h2 id="media-title">${e(media.title)}</h2></div><div><button class="text-button" type="button" data-copy>Copy link ${arrow}</button><button class="close-button" type="button" data-close-media aria-label="Close media"><span aria-hidden="true">×</span></button></div></header><div class="viewer-stage">${content}</div><footer class="viewer-footer"><p>${e(media.caption)}</p><div class="viewer-pagination"><button type="button" data-previous-media aria-label="Previous media" ${project.media.length < 2 ? 'disabled' : ''}>←</button><span aria-live="polite">${String(index + 1).padStart(2, '0')} / ${String(project.media.length).padStart(2, '0')}</span><button type="button" data-next-media aria-label="Next media" ${project.media.length < 2 ? 'disabled' : ''}>→</button></div></footer></div>`;
  const video = mediaDialog.querySelector('video');
  if (video) {
    const report = () => { mediaDialog.querySelector<HTMLElement>('.media-error')!.hidden = false; };
    video.addEventListener('error', report);
    video.querySelector('source')?.addEventListener('error', report);
  }
}

function pauseVideos(root: HTMLElement) { root.querySelectorAll('video').forEach(video => video.pause()); }

function syncRoute() {
  let route = readRoute(new URL(location.href));
  const project = data.projects.find(item => item.id === route.project);
  if (route.project && !project) {
    history.replaceState(null, '', routeUrl(location.href, { project: null, media: null }));
    route = { project: null, media: null };
    toast('Project unavailable. Browse the projects below.');
  }
  if (!project) {
    if (route.media) history.replaceState(null, '', routeUrl(location.href, { project: null, media: null }));
    pauseVideos(mediaDialog);
    mediaDialog.close(); projectDialog.close(); activeProject = undefined;
    document.documentElement.classList.remove('modal-open');
    document.title = `${data.profile.name} — ${data.profile.role}`;
    lastTrigger?.focus({ preventScroll: true });
    return;
  }
  if (activeProject?.id !== project.id) { renderProject(project); activeProject = project; }
  if (!projectDialog.open) { projectDialog.showModal(); projectDialog.querySelector<HTMLElement>('#project-title')?.focus({ preventScroll: true }); }
  document.querySelector('#cursor')?.classList.remove('is-visible');
  document.documentElement.classList.add('modal-open');
  document.title = `${project.title} — ${data.profile.name}`;
  const media = project.media.find(item => item.id === route.media);
  if (media) {
    const focus = mediaDialog.querySelector<HTMLElement>(':focus');
    const navigationAttribute = focus?.hasAttribute('data-next-media') ? '[data-next-media]' : focus?.hasAttribute('data-previous-media') ? '[data-previous-media]' : null;
    renderMedia(project, media);
    if (!mediaDialog.open) mediaDialog.showModal();
    mediaDialog.querySelector<HTMLElement>(navigationAttribute ?? '[data-close-media]')?.focus({ preventScroll: true });
    document.title = `${media.title} · ${project.title} — ${data.profile.name}`;
  } else {
    if (route.media) history.replaceState(history.state, '', routeUrl(location.href, { project: project.id, media: null }));
    pauseVideos(mediaDialog); mediaDialog.close();
  }
}

function openProject(id: string, replace = false) {
  const next = routeUrl(location.href, { project: id, media: null });
  if (replace) history.replaceState(history.state, '', next);
  else { lastTrigger = document.activeElement as HTMLElement; history.pushState({ portfolio: true, from: 'home' }, '', next); }
  syncRoute();
}

function openMedia(id: string, replace = false) {
  if (!activeProject) return;
  const next = routeUrl(location.href, { project: activeProject.id, media: id });
  if (replace) history.replaceState(history.state, '', next);
  else history.pushState({ portfolio: true, from: 'project' }, '', next);
  syncRoute();
}

function closeProject() {
  if (history.state?.portfolio && history.state.from === 'home') history.back();
  else { history.replaceState(null, '', routeUrl(location.href, { project: null, media: null })); syncRoute(); }
}

function closeMedia() {
  if (history.state?.portfolio && history.state.from === 'project') history.back();
  else { history.replaceState(null, '', routeUrl(location.href, { project: activeProject?.id ?? null, media: null })); syncRoute(); }
}

function nextMedia(direction: number) {
  if (!activeProject) return;
  const current = readRoute(new URL(location.href)).media;
  const media = activeProject.media;
  const index = media.findIndex(item => item.id === current);
  openMedia(media[(index + direction + media.length) % media.length].id, true);
}

async function copyLink() {
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied.');
  } catch {
    // Selection fallback works inside the active native dialog, including localhost over HTTP.
    const input = document.createElement('textarea');
    input.value = url; input.setAttribute('aria-label', 'Share link');
    input.style.cssText = 'position:fixed;left:12px;bottom:12px;width:calc(100% - 24px);z-index:5';
    const root = mediaDialog.open ? mediaDialog : projectDialog.open ? projectDialog : document.body;
    root.append(input); input.select();
    const copied = document.execCommand('copy');
    if (copied) { input.remove(); toast('Link copied.'); }
    else { toast('Copy the selected link to share.'); input.addEventListener('blur', () => input.remove(), { once: true }); }
  }
}

function bindEvents() {
  document.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('a, button');
    if (!target) return;
    if (target.dataset.project) {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); openProject(target.dataset.project);
    } else if (target.dataset.media) {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); openMedia(target.dataset.media);
    } else if (target.hasAttribute('data-close-project')) { event.preventDefault(); closeProject(); }
    else if (target.hasAttribute('data-close-media')) closeMedia();
    else if (target.hasAttribute('data-copy')) void copyLink();
    else if (target.hasAttribute('data-next-media')) nextMedia(1);
    else if (target.hasAttribute('data-previous-media')) nextMedia(-1);
    else if (target.hasAttribute('data-next-project') && activeProject) openProject(data.projects[(data.projects.indexOf(activeProject) + 1) % data.projects.length].id, true);
    else if (target.dataset.filter) {
      const filter = target.dataset.filter;
      app.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => { const selected = button.dataset.filter === filter; button.classList.toggle('is-active', selected); button.setAttribute('aria-pressed', String(selected)); });
      let count = 0;
      app.querySelectorAll<HTMLElement>('.project-card').forEach(card => { card.hidden = filter !== 'all' && card.dataset.category !== filter; if (!card.hidden) { count++; card.classList.add('is-revealed'); } });
      document.querySelector('#project-count')!.textContent = `${count} project${count === 1 ? '' : 's'}`;
    } else if (target.dataset.mediaFilter) {
      mediaFilter = target.dataset.mediaFilter;
      projectDialog.querySelectorAll<HTMLButtonElement>('[data-media-filter]').forEach(button => { const selected = button.dataset.mediaFilter === mediaFilter; button.classList.toggle('is-active', selected); button.setAttribute('aria-pressed', String(selected)); });
      let count = 0;
      projectDialog.querySelectorAll<HTMLElement>('.media-card').forEach(card => { card.hidden = mediaFilter !== 'all' && card.dataset.mediaType !== mediaFilter; if (!card.hidden) count++; });
      projectDialog.querySelector<HTMLElement>('.empty-media')!.hidden = count > 0;
    }
  });
  projectDialog.addEventListener('cancel', event => { event.preventDefault(); closeProject(); });
  mediaDialog.addEventListener('cancel', event => { event.preventDefault(); closeMedia(); });
  for (const dialog of [projectDialog, mediaDialog]) {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
        if (dialog === mediaDialog) closeMedia(); else closeProject();
      }
    });
  }
  mediaDialog.addEventListener('keydown', event => {
    if ((event.target as HTMLElement).matches('video, input, textarea')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); nextMedia(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); nextMedia(-1); }
  });
  document.addEventListener('error', event => {
    const img = event.target;
    if (img instanceof HTMLImageElement && !img.dataset.fallback) {
      img.dataset.fallback = 'true';
      img.src = safeUrl('media/placeholders/atlas.svg', base);
    }
  }, true);
  window.addEventListener('popstate', syncRoute);
}

async function init() {
  try {
    const response = await fetch(new URL('portfolio.json', base));
    if (!response.ok) throw new Error(`Unable to load portfolio.json (${response.status})`);
    data = await response.json() as Portfolio;
    if (!data.profile?.name || !data.profile.role || !data.projects?.length) throw new Error('portfolio.json: profile and projects are required.');
    const ids = new Set<string>();
    for (const project of data.projects) {
      if (!/^[a-z0-9-]+$/.test(project.id) || ids.has(project.id) || !Array.isArray(project.media)) throw new Error(`Invalid or duplicate project: ${project.id}`);
      ids.add(project.id);
      const mediaIds = new Set<string>();
      for (const media of project.media) {
        if (!/^[a-z0-9-]+$/.test(media.id) || mediaIds.has(media.id) || !['image', 'video'].includes(media.type)) throw new Error(`Invalid media in ${project.id}: ${media.id}`);
        mediaIds.add(media.id);
      }
    }
    bindEvents(); renderHome(); syncRoute();
  } catch (error) {
    console.error(error);
    app.setAttribute('aria-busy', 'false');
    app.innerHTML = '<main class="load-error"><p>Unable to load the portfolio.</p><h1>Gallery unavailable</h1><p>Please try again.</p><button type="button" id="retry">Try again ↗</button></main>';
    document.querySelector('#retry')?.addEventListener('click', () => location.reload());
  }
}

void init();
