import type { ImageSourcePropType } from 'react-native';

export interface PriceSliderItem {
  id: string;
  productName: string;
  year: number;
  actualPriceILS: number;
  currentPriceILS: number;
  minGuess: number;
  maxGuess: number;
  unit: string;
  hint: string;
  sharkExplanation: string;
  image?: ImageSourcePropType;
  category: 'food' | 'housing' | 'transport' | 'tech' | 'finance' | 'leisure';
}
