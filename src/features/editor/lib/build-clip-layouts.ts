import { Pixels } from "../types/primitives";
import { frameToPx, framesToPx } from "./timeline-math";
import { TimelineTrackLaneLayout } from "./build-track-lane-layouts";
import { TimelineClip, TimelineTrack } from "../types";

export type TimelineClipLayout = {
    clip: TimelineClip;
    left: Pixels;
    top: Pixels;
    width: Pixels;
    height: Pixels;
    resizeHandleWidth: Pixels;
    isTrackLocked: boolean;
    isTrackMuted: boolean;
    isTrackHidden: boolean;
};

export const buildClipLayouts = (
    clips: TimelineClip[],
    tracks: TimelineTrack[],
    trackLaneLayouts: TimelineTrackLaneLayout[],
    pixelsPerFrame: number,
): TimelineClipLayout[] => {
    const trackMap = new Map(tracks.map((track) => [track.id, track]));
    const laneMap = new Map(
        trackLaneLayouts.map((layout) => [layout.trackId, layout]),
    );

    return clips.flatMap((clip) => {
        const track = trackMap.get(clip.trackId);
        const lane = laneMap.get(clip.trackId);

        // Skip invalid clip references
        if (!track || !lane) {
            return [];
        }

        return [
            {
                clip,
                left: frameToPx(clip.from, pixelsPerFrame),
                top: lane.top + lane.itemInsetY,
                width: framesToPx(clip.durationInFrames, pixelsPerFrame),
                height: lane.itemHeight,
                resizeHandleWidth: lane.resizeHandleWidth,
                isTrackLocked: track.isLocked,
                isTrackMuted: track.isMuted,
                isTrackHidden: track.isHidden,
            },
        ];
    });
};
