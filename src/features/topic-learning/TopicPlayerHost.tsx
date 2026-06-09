import React, { useCallback } from 'react';
import type { Module } from '../chapter-1-content/types';
import type { Topic } from './types';
import { useTopicProgressStore } from './useTopicProgressStore';
import { IntroPlayer } from './playerAdapters/IntroPlayer';
import { VideoHookPlayerAdapter } from './playerAdapters/VideoHookPlayerAdapter';
import { CardsPlayer } from './playerAdapters/CardsPlayer';
import { QuizPlayer } from './playerAdapters/QuizPlayer';
import { SimPlayer } from './playerAdapters/SimPlayer';
import { RecallPlayer } from './playerAdapters/RecallPlayer';
import { InfographicPlayer } from './playerAdapters/InfographicPlayer';
import { PostVideoPlayer } from './playerAdapters/PostVideoPlayer';

interface TopicPlayerHostProps {
  topic: Topic | null;
  /** Needed by adapters that read other module fields (intro text, audio,
   *  flashcards, etc.). Looked up by the host's caller. */
  module: Module | null;
  onClose: () => void;
}

/**
 * Routes a tapped topic chip to the right per-kind player.
 *
 * v3 (2026-06-09): every TopicKind has a real adapter. PreviewPlayer
 * (the stub from v2) was retired — no more "סמן כהושלם" hub. A chip
 * tap opens the actual experience, and `onComplete` from the adapter
 * marks the topic done + closes back to the accordion.
 *
 * Coverage note: podcast / couple-dilemma kinds resolve to null for now
 * because mod-1-1 doesn't have those fields and the pilot is scoped to
 * mod-1-1. When the next pilot module adds either, add an adapter and
 * route it here.
 */
export function TopicPlayerHost({
  topic,
  module,
  onClose,
}: TopicPlayerHostProps): React.ReactElement | null {
  const markTopicCompleted = useTopicProgressStore((s) => s.markTopicCompleted);

  const handleComplete = useCallback(() => {
    if (!topic) return;
    markTopicCompleted(topic);
    onClose();
  }, [topic, markTopicCompleted, onClose]);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!topic || !module) return null;

  switch (topic.kind) {
    case 'intro':
      return <IntroPlayer module={module} onComplete={handleComplete} onDismiss={handleDismiss} />;
    case 'video-hook':
      return <VideoHookPlayerAdapter module={module} onComplete={handleComplete} onDismiss={handleDismiss} />;
    case 'cards':
      return <CardsPlayer module={module} onComplete={handleComplete} onDismiss={handleDismiss} />;
    case 'quiz':
      return <QuizPlayer module={module} onComplete={handleComplete} onDismiss={handleDismiss} />;
    case 'sim':
      return <SimPlayer module={module} onComplete={handleComplete} onDismiss={handleDismiss} />;
    case 'recall':
      return <RecallPlayer module={module} onComplete={handleComplete} onDismiss={handleDismiss} />;
    case 'infographic':
      return <InfographicPlayer module={module} onComplete={handleComplete} onDismiss={handleDismiss} />;
    case 'post-video':
      return <PostVideoPlayer module={module} onComplete={handleComplete} onDismiss={handleDismiss} />;
    // podcast / couple-dilemma intentionally unhandled — mod-1-1 doesn't
    // resolve those topics, so no adapter ships in the pilot.
    default:
      return null;
  }
}
