export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function safeUrl(path: string, base: string): string {
  if (!path.trim()) return '';
  try {
    const url = new URL(path, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

export function mediaLabel(images: number, videos: number): string {
  return [videos ? `${videos} video${videos === 1 ? '' : 's'}` : '', images ? `${images} image${images === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
}
