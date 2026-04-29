import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { GroupBuyProjectScreen } from '../../../src/features/clan/GroupBuyProjectScreen';

export default function ProjectRoute(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GroupBuyProjectScreen projectId={id} />;
}