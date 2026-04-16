import type { ImageSourcePropType } from 'react-native';
import type { AdTemplate, AdTemplateId } from './types';

const TEMPLATE_IMAGES: Record<AdTemplateId, ImageSourcePropType> = {
  'scam-neon': require('../../../../../assets/webp/minigames/bullshit-swipe/templates/ad-bg-scam-neon.webp'),
  'scam-crypto': require('../../../../../assets/webp/minigames/bullshit-swipe/templates/ad-bg-scam-crypto.webp'),
  'scam-aspirational': require('../../../../../assets/webp/minigames/bullshit-swipe/templates/ad-bg-scam-aspirational.webp'),
  'scam-tech': require('../../../../../assets/webp/minigames/bullshit-swipe/templates/ad-bg-scam-tech.webp'),
  'scam-realestate': require('../../../../../assets/webp/minigames/bullshit-swipe/templates/ad-bg-scam-realestate.webp'),
  'legit-corporate': require('../../../../../assets/webp/minigames/bullshit-swipe/templates/ad-bg-legit-corporate.webp'),
  'legit-warm': require('../../../../../assets/webp/minigames/bullshit-swipe/templates/ad-bg-legit-warm.webp'),
};

export const STAMP_FRAME_RED: ImageSourcePropType =
  require('../../../../../assets/webp/minigames/bullshit-swipe/stamp-frame-red.webp');

export const STAMP_FRAME_GREEN: ImageSourcePropType =
  require('../../../../../assets/webp/minigames/bullshit-swipe/stamp-frame-green.webp');

export const AD_TEMPLATES: Record<AdTemplateId, AdTemplate> = {
  'scam-neon': {
    id: 'scam-neon',
    gradient: ['#ec4899', '#7c3aed'],
    textColor: '#ffffff',
    accentColor: '#facc15',
    moodTag: 'scam',
    image: TEMPLATE_IMAGES['scam-neon'],
  },
  'scam-crypto': {
    id: 'scam-crypto',
    gradient: ['#0a0e27', '#000000'],
    textColor: '#facc15',
    accentColor: '#22d3ee',
    moodTag: 'scam',
    image: TEMPLATE_IMAGES['scam-crypto'],
  },
  'scam-aspirational': {
    id: 'scam-aspirational',
    gradient: ['#fed7aa', '#fef3c7'],
    textColor: '#78350f',
    accentColor: '#d4a017',
    moodTag: 'scam',
    image: TEMPLATE_IMAGES['scam-aspirational'],
  },
  'scam-tech': {
    id: 'scam-tech',
    gradient: ['#050a15', '#0f172a'],
    textColor: '#facc15',
    accentColor: '#4ade80',
    moodTag: 'scam',
    image: TEMPLATE_IMAGES['scam-tech'],
  },
  'scam-realestate': {
    id: 'scam-realestate',
    gradient: ['#1e3a8a', '#d4a017'],
    textColor: '#ffffff',
    accentColor: '#facc15',
    moodTag: 'scam',
    image: TEMPLATE_IMAGES['scam-realestate'],
  },
  'legit-corporate': {
    id: 'legit-corporate',
    gradient: ['#1e3a8a', '#0f1e4a'],
    textColor: '#ffffff',
    accentColor: '#fbbf24',
    moodTag: 'legit',
    image: TEMPLATE_IMAGES['legit-corporate'],
  },
  'legit-warm': {
    id: 'legit-warm',
    gradient: ['#fbbf24', '#fed7aa'],
    textColor: '#431407',
    accentColor: '#92400e',
    moodTag: 'legit',
    image: TEMPLATE_IMAGES['legit-warm'],
  },
};

export function getTemplate(id: AdTemplateId): AdTemplate {
  return AD_TEMPLATES[id];
}
