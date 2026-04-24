import { Frames, Pixels } from "@/src/features/editor/types/primitives";
import {
    DurationBucketRule,
    MIN_TIMELINE_WIDTH,
    TIMELINE_DURATION_BUCKET_RULES,
    TickUnit,
    getTickUnitFrames,
} from "./timeline-zoom-spec";

export type TimelineZoomComputed = {
    tickUnit: TickUnit;
    tickFrames: Frames;
    visibleDurationInFrames: Frames;
    timelineWidth: Pixels;
    pixelsPerFrame: number;
    tickCount: number;
};

const clampZoom = (zoomLevel: number) => Math.max(1, Math.min(10, zoomLevel));

const getDurationBucketRule = (
    durationInSeconds: number,
): DurationBucketRule => {
    return (
        TIMELINE_DURATION_BUCKET_RULES.find(
            (rule) => durationInSeconds <= rule.maxDurationSeconds,
        ) ??
        TIMELINE_DURATION_BUCKET_RULES[
            TIMELINE_DURATION_BUCKET_RULES.length - 1
        ]
    );
};

const snapUpToMultiple = (value: number, step: number) => {
    if (step <= 0) return value;
    return Math.ceil(value / step) * step;
};

/**
 * Keep major tick spacing growing with zoom.
 * Once the tick unit reaches 15f, further zoom only increases width/gaps.
 */
const getTargetTickSpacingPx = (zoomLevel: number) => {
    return 191.9 + (zoomLevel - 1) * 45;
};

const MIN_VISIBLE_TICK_COUNT = 10;

const getMinimumTimelineWidthForZoom = (zoomLevel: number) => {
    // OLD logic: Short timelines were clamped to the same minimum width, so zoom 2 could look unchanged.
    // NEW logic: The minimum width also grows with zoom so every zoom step has visible effect.
    return MIN_TIMELINE_WIDTH * (1 + (zoomLevel - 1) * 0.25);
};

export const computeTimelineZoom = ({
    durationInFrames,
    fps,
    zoomLevel,
}: {
    durationInFrames: Frames;
    fps: number;
    zoomLevel: number;
}): TimelineZoomComputed => {
    const safeZoom = clampZoom(zoomLevel);
    const durationInSeconds = durationInFrames / fps;

    const bucketRule = getDurationBucketRule(durationInSeconds);
    const tickUnit = bucketRule.zoomMap[safeZoom];
    const tickFrames = getTickUnitFrames(tickUnit, fps);

    const tailPaddingFrames = bucketRule.tailPaddingSeconds * fps;

    /**
     * Timeline visible duration is larger than project duration.
     * It is padded and snapped up to the current tick family.
     */
    const paddedVisibleDurationInFrames = snapUpToMultiple(
        durationInFrames + tailPaddingFrames,
        tickFrames,
    );
    const minimumVisibleDurationInFrames = tickFrames * MIN_VISIBLE_TICK_COUNT;
    const visibleDurationInFrames = Math.max(
        // OLD logic: Empty or very short projects could render too few ruler ticks.
        // NEW logic: Keep project duration unchanged, but guarantee enough visible timeline ticks.
        minimumVisibleDurationInFrames,
        paddedVisibleDurationInFrames,
    );

    const tickCount = Math.max(
        1,
        Math.round(visibleDurationInFrames / tickFrames),
    );

    const targetTickSpacingPx = getTargetTickSpacingPx(safeZoom);
    const computedWidth = tickCount * targetTickSpacingPx;

    const timelineWidth = Math.max(
        getMinimumTimelineWidthForZoom(safeZoom),
        computedWidth,
    );

    const usableWidth = Math.max(0, timelineWidth - 30);
    const pixelsPerFrame =
        visibleDurationInFrames > 0 ? usableWidth / visibleDurationInFrames : 0;

    return {
        tickUnit,
        tickFrames,
        visibleDurationInFrames,
        timelineWidth,
        pixelsPerFrame,
        tickCount,
    };
};
