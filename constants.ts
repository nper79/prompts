
import { PromptItem } from './types';

export const INITIAL_PROMPTS: PromptItem[] = [
  {
    id: '1',
    title: 'Neon Cyberpunk Samurai',
    tags: ['cyberpunk', 'neon', 'samurai', 'cinematic', 'tokyo'],
    json: JSON.stringify({
      "subject": "Cyborg Samurai",
      "environment": "Rainy neon Tokyo alley",
      "lighting": "Blue and magenta neon rim lights",
      "style": "Cinematic realism, high contrast",
      "details": ["Wet pavement reflections", "Floating holographic kanji", "Carbon fiber armor"],
      "camera": "85mm lens, f/1.8"
    }, null, 2),
    imageUrl: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=1000&auto=format&fit=crop',
    author: 'Admin',
    authorUrl: 'https://x.com/google',
    createdAt: '2024-03-20'
  },
  {
    id: '2',
    title: 'Ethereal Forest Spirit',
    tags: ['fantasy', 'ethereal', 'nature', 'bioluminescent', 'dreamy'],
    json: JSON.stringify({
      "creature": "Stag made of starlight",
      "location": "Ancient bioluminescent forest",
      "atmosphere": "Mystical, misty, dreamy",
      "palette": ["Emerald green", "Deep violet", "Cyan"],
      "composition": "Low angle, wide shot",
      "effects": ["Fireflies", "Floating seeds", "Bloom effect"]
    }, null, 2),
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop',
    author: 'Admin',
    createdAt: '2024-03-21'
  },
  {
    id: '3',
    title: 'Architecture: Solar Punk Hub',
    tags: ['architecture', 'solarpunk', 'utopian', 'greenery', 'future'],
    json: JSON.stringify({
      "building": "Vertical garden skyscraper",
      "era": "Solar Punk future",
      "materials": ["White polished concrete", "Crystal glass", "Vibrant greenery"],
      "weather": "Golden hour sunlight",
      "vibe": "Utopian, clean, peaceful",
      "technical": "Architectural photography, tilt-shift"
    }, null, 2),
    imageUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=1000&auto=format&fit=crop',
    author: 'Innovator',
    authorUrl: 'https://twitter.com',
    createdAt: '2024-03-22'
  }
];
