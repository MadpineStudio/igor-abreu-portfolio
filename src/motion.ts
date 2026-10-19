export function initMotion() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const cursor = document.querySelector<HTMLDivElement>('#cursor')!;
  const hero = document.querySelector<HTMLElement>('.hero-art');
  const heroSection = document.querySelector<HTMLElement>('.hero');
  let targetX = 0;
  let targetY = 0;
  let x = 0;
  let y = 0;
  let raf = 0;
  let active = false;
  let currentCard: HTMLElement | null = null;

  function animate() {
    if (reduced.matches || document.hidden) { raf = 0; return; }
    x += (targetX - x) * 0.18;
    y += (targetY - y) * 0.18;
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > 0.2 && active) raf = requestAnimationFrame(animate);
    else raf = 0;
  }

  function resetCard() {
    currentCard?.style.setProperty('--rotate-x', '0deg');
    currentCard?.style.setProperty('--rotate-y', '0deg');
    currentCard = null;
  }

  document.addEventListener('pointermove', event => {
    if (reduced.matches || !fine.matches || event.pointerType === 'touch') return;
    const target = event.target as HTMLElement;
    const card = target.closest<HTMLElement>('[data-cursor]');
    active = !!card && !document.querySelector('dialog[open]');
    cursor.classList.toggle('is-visible', active);
    targetX = event.clientX;
    targetY = event.clientY;
    if (!raf && active) raf = requestAnimationFrame(animate);
    if (currentCard !== card) resetCard();
    if (card && active) {
      currentCard = card;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--rotate-x', `${((event.clientY - rect.top) / rect.height - .5) * -3}deg`);
      card.style.setProperty('--rotate-y', `${((event.clientX - rect.left) / rect.width - .5) * 3}deg`);
    }
  }, { passive: true });

  document.addEventListener('pointerleave', () => { active = false; cursor.classList.remove('is-visible'); resetCard(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } });
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      cancelAnimationFrame(raf); raf = 0; cursor.classList.remove('is-visible'); resetCard();
      hero?.style.setProperty('--parallax', '0px');
    }
  });

  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    document.querySelector('.site-header')?.classList.toggle('is-scrolled', window.scrollY > 40);
    if (hero && heroSection && !reduced.matches) {
      const height = heroSection.offsetHeight;
      hero.style.setProperty('--parallax', `${Math.min(window.scrollY, height) * .22}px`);
    }
  }
  window.addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }, { passive: true });
  updateScroll();

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    }
  }, { threshold: .08 });
  document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
}
