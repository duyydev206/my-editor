import { Frame, Frames, Pixels } from "@/src/features/editor/types/primitives";

export const TIMELINE_GUTTER_X: Pixels = 15;
export const TRACK_HEADER_WIDTH: Pixels = 111;
export const RULER_HEIGHT: Pixels = 28;

export const frameToPx = (
    frame: Frame,
    pixelsPerFrame: number,
    gutterX: Pixels = TIMELINE_GUTTER_X,
): Pixels => {
    return gutterX + frame * pixelsPerFrame;
};

export const framesToPx = (frames: Frames, pixelsPerFrame: number): Pixels => {
    return frames * pixelsPerFrame;
};

export const pxToFrame = (
    px: Pixels,
    pixelsPerFrame: number,
    gutterX: Pixels = TIMELINE_GUTTER_X,
): Frame => {
    const raw = (px - gutterX) / pixelsPerFrame;
    return Math.max(0, Math.round(raw));
};

export const getTimelineContentWidth = (
    durationInFrames: Frames,
    pixelsPerFrame: number,
    gutterX: Pixels = TIMELINE_GUTTER_X,
): Pixels => {
    return durationInFrames * pixelsPerFrame + gutterX * 2;
};
