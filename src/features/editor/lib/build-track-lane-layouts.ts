import { TimelineClip, TimelineTrack, TrackMediaKind } from "../types";
import { Pixels, TrackId } from "../types/primitives";

export type TimelineTrackLaneLayout = {
    trackId: TrackId;
    kind: TrackMediaKind;
    top: Pixels;
    laneHeight: Pixels;
    itemInsetY: Pixels;
    itemHeight: Pixels;
    resizeHandleWidth: Pixels;
};

export type BuildTrackLaneLayoutsResult = {
    layouts: TimelineTrackLaneLayout[];
    totalHeight: Pixels;
};

type TimelineTrackVisualConfig = {
    laneHeight: Pixels;
    itemInsetY: Pixels;
    resizeHandleWidth: Pixels;
};

const DEFAULT_TIMELINE_TRACK_VISUAL_CONFIG: TimelineTrackVisualConfig = {
    laneHeight: 35,
    itemInsetY: 1.5,
    resizeHandleWidth: 6,
};

const TIMELINE_TRACK_VISUAL_CONFIG: Record<
    TrackMediaKind,
    TimelineTrackVisualConfig
> = {
    text: { laneHeight: 35, itemInsetY: 1.5, resizeHandleWidth: 6 },
    shape: { laneHeight: 35, itemInsetY: 1.5, resizeHandleWidth: 6 },
    audio: { laneHeight: 35, itemInsetY: 1.5, resizeHandleWidth: 6 },
    video: { laneHeight: 71, itemInsetY: 1.5, resizeHandleWidth: 6 },
    image: { laneHeight: 35, itemInsetY: 1.5, resizeHandleWidth: 6 },
};

const clampPositive = (value: number, fallback: number): number => {
    if (!Number.isFinite(value) || value <= 0) {
        return fallback;
    }
    return value;
};

export const buildTrackLaneLayouts = (
    tracks: TimelineTrack[],
    clips: TimelineClip[] = [],
): BuildTrackLaneLayoutsResult => {
    if (!Array.isArray(tracks) || tracks.length === 0) {
        return {
            layouts: [],
            totalHeight: 0,
        };
    }

    const sortedTracks = [...tracks].sort((a, b) => a.index - b.index);

    let currentTop = 0;

    const layouts = sortedTracks.map((track) => {
        const trackClipTypes = clips
            .filter((clip) => clip.trackId === track.id)
            .map((clip) => clip.type);
        const visualKinds = [track.kind, ...trackClipTypes];
        const config = visualKinds.reduce<TimelineTrackVisualConfig>(
            (largestConfig, kind) => {
                const kindConfig =
                    TIMELINE_TRACK_VISUAL_CONFIG[kind] ??
                    DEFAULT_TIMELINE_TRACK_VISUAL_CONFIG;

                return kindConfig.laneHeight > largestConfig.laneHeight
                    ? kindConfig
                    : largestConfig;
            },
            DEFAULT_TIMELINE_TRACK_VISUAL_CONFIG,
        );

        // OLD logic: track.height always overrode the visual config, so changing TIMELINE_TRACK_VISUAL_CONFIG did nothing for valid tracks.
        // NEW logic: Lane height follows the tallest clip kind in the lane; empty lanes fall back to track kind.
        const laneHeight = clampPositive(config.laneHeight, track.height);

        // Prevent invalid item height
        const maxInsetY = Math.max(0, (laneHeight - 1) / 2);
        const itemInsetY = Math.min(config.itemInsetY, maxInsetY);
        const itemHeight = Math.max(1, laneHeight - itemInsetY * 2);

        const layout: TimelineTrackLaneLayout = {
            trackId: track.id,
            kind: track.kind,
            top: currentTop,
            laneHeight,
            itemInsetY,
            itemHeight,
            resizeHandleWidth: config.resizeHandleWidth,
        };

        currentTop += laneHeight;
        return layout;
    });

    return {
        layouts,
        totalHeight: currentTop,
    };
};
