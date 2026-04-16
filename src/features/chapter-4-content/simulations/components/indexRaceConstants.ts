import { Dimensions } from 'react-native';

export const INDEX_RACE_SCREEN_WIDTH = Dimensions.get('window').width;
export const INDEX_RACE_CHART_WIDTH = INDEX_RACE_SCREEN_WIDTH - 80;
export const INDEX_RACE_CHART_HEIGHT = 140;

export const INDEX_RACE_LINE_COLORS = {
  portfolio: '#f59e0b',
  index: '#3b82f6',
} as const;
