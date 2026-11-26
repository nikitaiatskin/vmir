import { requireOptionalNativeModule } from 'expo';

import type { HangerVisionNative } from './src/types';

export * from './src/types';

/**
 * The native module, or `null` when it is not compiled into the binary
 * (Jest, web, or an outdated development build). Callers must handle `null`.
 * Use the safe wrappers in `src/features/vision.ts` instead of calling this directly.
 */
export const HangerVision = requireOptionalNativeModule<HangerVisionNative>('HangerVision');
