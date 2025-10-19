/**
 * Lip sync animation controller.
 * Manages viseme timeline and calculates current viseme weights for animation.
 */

import { AlignmentUnit, VisemeName, VisemeWeight, VisemeTimeline } from '../../types/interview';
import { charToViseme, lerp, easeInOutCubic } from './visemeMap';

export class LipSyncController {
  private timeline: VisemeTimeline[] = [];
  private basePlaybackTime = 0;
  private readonly BLEND_TIME = 0.05; // 50ms blend between visemes
  private readonly DECAY_TIME = 0.2; // 200ms to return to neutral after speech

  /**
   * Add alignment data to the timeline.
   */
  addAlignmentData(alignments: AlignmentUnit[], baseTime: number): void {
    this.basePlaybackTime = baseTime;

    for (const align of alignments) {
      const viseme = charToViseme(align.val);

      // Skip silence for repeated spaces
      if (viseme === 'sil' && align.val.trim() === '') {
        continue;
      }

      this.timeline.push({
        time: baseTime + align.t,
        viseme,
        duration: align.d,
      });
    }
  }

  /**
   * Get current viseme weights for given playback time.
   */
  getCurrentVisemes(currentTime: number): VisemeWeight[] {
    if (this.timeline.length === 0) {
      return [{ viseme: 'sil', weight: 1.0 }];
    }

    // Find active viseme events
    const activeEvents = this.timeline.filter((event) => {
      const endTime = event.time + event.duration;
      return currentTime >= event.time && currentTime <= endTime + this.BLEND_TIME;
    });

    if (activeEvents.length === 0) {
      // Check if we're past all events
      const lastEvent = this.timeline[this.timeline.length - 1];
      const lastEventEnd = lastEvent.time + lastEvent.duration;

      if (currentTime > lastEventEnd) {
        // Decay to silence
        const timeSinceEnd = currentTime - lastEventEnd;
        const decayProgress = Math.min(timeSinceEnd / this.DECAY_TIME, 1.0);
        const weight = 1.0 - easeInOutCubic(decayProgress);

        if (weight > 0.01) {
          return [
            { viseme: lastEvent.viseme, weight },
            { viseme: 'sil', weight: 1.0 - weight },
          ];
        }
      }

      // Default to silence
      return [{ viseme: 'sil', weight: 1.0 }];
    }

    // Calculate weights for active events
    const weights: Map<VisemeName, number> = new Map();

    for (const event of activeEvents) {
      const eventStart = event.time;
      const eventEnd = event.time + event.duration;
      const blendEndTime = eventEnd + this.BLEND_TIME;

      let weight = 0;

      if (currentTime < eventStart + this.BLEND_TIME) {
        // Blend in
        const progress = (currentTime - eventStart) / this.BLEND_TIME;
        weight = easeInOutCubic(Math.max(0, Math.min(1, progress)));
      } else if (currentTime >= eventStart + this.BLEND_TIME && currentTime <= eventEnd) {
        // Full weight
        weight = 1.0;
      } else if (currentTime > eventEnd && currentTime <= blendEndTime) {
        // Blend out
        const progress = (currentTime - eventEnd) / this.BLEND_TIME;
        weight = 1.0 - easeInOutCubic(Math.max(0, Math.min(1, progress)));
      }

      if (weight > 0) {
        const existing = weights.get(event.viseme) || 0;
        weights.set(event.viseme, Math.max(existing, weight));
      }
    }

    // Normalize weights
    const totalWeight = Array.from(weights.values()).reduce((sum, w) => sum + w, 0);
    const result: VisemeWeight[] = [];

    if (totalWeight > 0) {
      for (const [viseme, weight] of weights.entries()) {
        result.push({
          viseme,
          weight: weight / totalWeight,
        });
      }
    } else {
      result.push({ viseme: 'sil', weight: 1.0 });
    }

    return result;
  }

  /**
   * Clear the timeline.
   */
  clear(): void {
    this.timeline = [];
    this.basePlaybackTime = 0;
  }

  /**
   * Get the full timeline (for debugging).
   */
  getTimeline(): VisemeTimeline[] {
    return this.timeline;
  }
}
