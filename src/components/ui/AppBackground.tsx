import { View } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  children: ReactNode;
}

/**
 * AppBackground — adaptive light/dark base for all screens.
 */
export function AppBackground({ children }: Props) {
  const theme = useTheme();
  return <View style={{ flex: 1, backgroundColor: theme.bg }}>{children}</View>;
}
