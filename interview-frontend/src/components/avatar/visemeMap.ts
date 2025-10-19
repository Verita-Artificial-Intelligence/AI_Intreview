/**
 * Viseme mapping for lip sync animation.
 * Maps characters/phonemes from ElevenLabs to Ready Player Me OVRLipSync visemes.
 */

import { VisemeName } from '../../types/interview';

/**
 * Map character to viseme name.
 * Based on OVRLipSync viseme set used by Ready Player Me.
 */
export function charToViseme(char: string): VisemeName {
  const upper = char.toUpperCase();

  // Vowels
  if (upper === 'A') return 'aa';
  if (upper === 'E') return 'E';
  if (upper === 'I') return 'I';
  if (upper === 'O') return 'O';
  if (upper === 'U') return 'U';

  // Labials (lips together): M, B, P
  if (upper === 'M' || upper === 'B' || upper === 'P') return 'PP';

  // Labiodentals (lip-teeth): F, V
  if (upper === 'F' || upper === 'V') return 'FF';

  // Dental: TH
  if (upper === 'T' && char.length > 1) return 'TH'; // Simplified TH detection

  // Alveolar: D, T, L, N
  if (upper === 'D' || upper === 'T' || upper === 'L') return 'DD';
  if (upper === 'N') return 'nn';

  // Velar: K, G
  if (upper === 'K' || upper === 'G') return 'kk';

  // Postalveolar: CH, J, SH
  if (upper === 'C' || upper === 'J') return 'CH';

  // Alveolar fricative: S, Z
  if (upper === 'S' || upper === 'Z') return 'SS';

  // Rhotic: R
  if (upper === 'R') return 'RR';

  // Default: silence for spaces and unknown characters
  return 'sil';
}

/**
 * Get Ready Player Me morph target name for viseme.
 */
export function visemeToMorphTarget(viseme: VisemeName): string {
  // Ready Player Me uses viseme_ prefix
  switch (viseme) {
    case 'sil':
      return 'viseme_sil';
    case 'PP':
      return 'viseme_PP';
    case 'FF':
      return 'viseme_FF';
    case 'TH':
      return 'viseme_TH';
    case 'DD':
      return 'viseme_DD';
    case 'kk':
      return 'viseme_kk';
    case 'CH':
      return 'viseme_CH';
    case 'SS':
      return 'viseme_SS';
    case 'nn':
      return 'viseme_nn';
    case 'RR':
      return 'viseme_RR';
    case 'aa':
      return 'viseme_aa';
    case 'E':
      return 'viseme_E';
    case 'I':
      return 'viseme_I';
    case 'O':
      return 'viseme_O';
    case 'U':
      return 'viseme_U';
    default:
      return 'viseme_sil';
  }
}

/**
 * Get list of all viseme morph target names.
 */
export function getAllVisemeMorphTargets(): string[] {
  return [
    'viseme_sil',
    'viseme_PP',
    'viseme_FF',
    'viseme_TH',
    'viseme_DD',
    'viseme_kk',
    'viseme_CH',
    'viseme_SS',
    'viseme_nn',
    'viseme_RR',
    'viseme_aa',
    'viseme_E',
    'viseme_I',
    'viseme_O',
    'viseme_U',
  ];
}

/**
 * Smooth transition between visemes using easing.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Linear interpolation.
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
