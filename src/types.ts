export interface Media {
  id: string;
  type: 'image' | 'video';
  title: string;
  caption: string;
  src: string;
  poster: string;
  alt: string;
  aspect?: 'wide' | 'square' | 'portrait';
  tracks?: { src: string; label: string; language: string }[];
}

export interface Project {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  category: string;
  year: string;
  cover: string;
  coverAlt: string;
  description: string;
  tools: string[];
  credits: string;
  media: Media[];
}

export interface Portfolio {
  profile: {
    name: string;
    role: string;
    headline: string[];
    heroImage: string;
    heroAlt: string;
    email: string;
    socials: { label: string; url: string }[];
  };
  projects: Project[];
}
