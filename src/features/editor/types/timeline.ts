import { ClipId, Frame, Pixels, TrackGroupId, TrackId } from "./primitives";

export type SelectionState = {
    selectedClipIds: ClipId[];
    selectedTrackId: TrackId | null;
    selectedGroupId: TrackGroupId | null;
};

export type TimelineZoomState = {
    zoomLevel: number;
    minZoomLevel: number;
    maxZoomLevel: number;
    pixelsPerFrame: number;
};

export type TimelineViewportState = {
    scrollLeft: Pixels;
    scrollTop: Pixels;
    viewportWidth: Pixels;
    viewportHeight: Pixels;
};

export type TimelineToolbarState = {
    snapEnabled: boolean;
    showRuler: boolean;
    showWaveforms: boolean;
    showThumbnails: boolean;
    isLoopEnabled: boolean;
};

export type TimelineRulerMarker = {
    frame: Frame;
    x: Pixels;
    label: string;
    isMajor: boolean;
};

export type TimelineSnapGuide = {
    frame: Frame;
    x: Pixels;
    visible: boolean;
};

export type TimelineUIState = {
    zoom: TimelineZoomState;
    viewport: TimelineViewportState;
    toolbar: TimelineToolbarState;
    panelHeight: Pixels;
};
