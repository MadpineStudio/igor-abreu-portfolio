export interface GalleryRoute { project: string | null; media: string | null }

export function readRoute(url: URL): GalleryRoute {
  return {
    project: url.searchParams.get('project') ?? url.searchParams.get('projeto'),
    media: url.searchParams.get('media') ?? url.searchParams.get('midia'),
  };
}

export function routeUrl(current: string | URL, route: GalleryRoute): URL {
  const url = new URL(current);
  url.searchParams.delete('projeto');
  url.searchParams.delete('midia');
  for (const [key, value] of [['project', route.project], ['media', route.media]] as const) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (!route.project) url.searchParams.delete('media');
  if (route.project) url.hash = '';
  return url;
}
