import type { HeroImage } from './types';
import { safeUrl } from './utils';

export function initHeroCarousel(images: HeroImage[], base: string, reportError: () => void) {
  if (images.length < 2) return;
  const art = document.querySelector<HTMLElement>('.hero-art')!;
  const controls = document.querySelector<HTMLElement>('.hero-controls')!;
  const position = controls.querySelector<HTMLElement>('[data-hero-position]')!;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = art.querySelector<HTMLImageElement>('img')!;
  let selectedIndex = 0;
  let requestedIndex = 0;
  let requestId = 0;

  async function change(direction: number) {
    requestedIndex = (requestedIndex + direction + images.length) % images.length;
    const nextIndex = requestedIndex;
    const request = ++requestId;
    const next = new Image();
    next.alt = images[nextIndex].alt;
    next.className = 'hero-image';
    next.decoding = 'async';
    controls.setAttribute('aria-busy', 'true');
    try {
      // Keep the current background visible until the requested image is ready.
      const loaded = typeof next.decode === 'function' ? null : new Promise<void>((resolve, reject) => {
        next.onload = () => resolve();
        next.onerror = () => reject(new Error('Background image unavailable'));
      });
      next.src = safeUrl(images[nextIndex].src, base);
      await (loaded ?? next.decode());
      if (request !== requestId) return;
      const previous = current;
      current = next;
      selectedIndex = nextIndex;
      next.classList.add('is-entering');
      art.append(next);
      position.textContent = `${String(nextIndex + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}`;
      controls.removeAttribute('aria-busy');
      window.setTimeout(() => {
        previous.remove();
        next.classList.remove('is-entering');
      }, reduced.matches ? 0 : 650);
    } catch {
      if (request !== requestId) return;
      requestedIndex = selectedIndex;
      controls.removeAttribute('aria-busy');
      reportError();
    }
  }

  controls.querySelector('[data-hero-previous]')!.addEventListener('click', () => { void change(-1); });
  controls.querySelector('[data-hero-next]')!.addEventListener('click', () => { void change(1); });
  controls.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      void change(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
}
