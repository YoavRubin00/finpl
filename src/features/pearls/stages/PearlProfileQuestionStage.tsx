import React, { useEffect } from 'react';
import { View } from 'react-native';
import { InModuleProfileQuestion } from '../../onboarding/InModuleProfileQuestion';
import type { ProfileQuestionKind } from '../../onboarding/InModuleProfileQuestion';

interface PearlProfileQuestionStageProps {
  isActive: boolean;
  kind: ProfileQuestionKind;
  onDone: () => void;
}

/**
 * Renders an InModuleProfileQuestion inside the Pearl pager. The underlying
 * component is a Modal — that's fine here: it overlays the (still-mounted)
 * pager and dismisses itself via `onDone`, which we re-emit to advance the
 * Pearl to the next stage.
 *
 * The "was this already answered" check happens in PearlSheet (so it can
 * decide WHICH stages to include in the pager at mount time, avoiding
 * empty/skipped pages). By the time this component renders, the question
 * is known to be UN-answered.
 */
export function PearlProfileQuestionStage({ isActive, kind, onDone }: PearlProfileQuestionStageProps): React.ReactElement {
  // The Modal underneath is gated on isActive — we only render it when this
  // page is in view, so the modal doesn't pop on top of the wrong stage.
  useEffect(() => {
    // no-op; placeholder for any side-effects added later (e.g. analytics)
  }, [isActive]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <InModuleProfileQuestion visible={isActive} kind={kind} onDone={onDone} />
    </View>
  );
}
