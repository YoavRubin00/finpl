import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AnonAdvicePostScreen } from '../../../src/features/anon-advice/AnonAdvicePostScreen';

export default function AnonAdvicePostRoute(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AnonAdvicePostScreen postId={String(id)} />;
}