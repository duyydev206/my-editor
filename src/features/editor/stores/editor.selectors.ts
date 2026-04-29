import { useEditorStore } from "./editor.store";

// ===== Project =====
export const useEditorProject = () => useEditorStore((state) => state.project);

export const useEditorVideo = () =>
    useEditorStore((state) => state.project.video);

// ===== Player =====
export const usePlayerState = () =>
    useEditorStore((state) => state.runtime.player);

export const usePlaybackStatus = () =>
    useEditorStore((state) => state.runtime.player.status);

export const useCurrentFrame = () =>
    useEditorStore((state) => state.runtime.player.currentFrame);

export const useIsMuted = () =>
    useEditorStore((state) => state.runtime.player.isMuted);

export const usePlaybackRate = () =>
    useEditorStore((state) => state.runtime.player.playbackRate);

// ===== Preview =====
export const usePreviewState = () =>
    useEditorStore((state) => state.runtime.preview);

export const usePreviewFullscreen = () =>
    useEditorStore((state) => state.runtime.preview.isFullscreen);

export const useTogglePreviewFullscreen = () =>
    useEditorStore((state) => state.togglePreviewFullscreen);

// ===== Timeline =====
export const useTimelineState = () =>
    useEditorStore((state) => state.runtime.timeline);

export const useTimelineZoom = () =>
    useEditorStore((state) => state.runtime.timeline.zoom);

export const useTimelineZoomLevel = () =>
    useEditorStore((state) => state.runtime.timeline.zoom.zoomLevel);

export const useTimelinePixelsPerFrame = () =>
    useEditorStore((state) => state.runtime.timeline.zoom.pixelsPerFrame);

export const useTimelineViewport = () =>
    useEditorStore((state) => state.runtime.timeline.viewport);

export const useTimelineToolbarState = () =>
    useEditorStore((state) => state.runtime.timeline.toolbar);

export const useSnapEnabled = () =>
    useEditorStore((state) => state.runtime.timeline.toolbar.snapEnabled);

export const useLoopEnabled = () =>
    useEditorStore((state) => state.runtime.timeline.toolbar.isLoopEnabled);

export const useShowRuler = () =>
    useEditorStore((state) => state.runtime.timeline.toolbar.showRuler);

export const useShowWaveforms = () =>
    useEditorStore((state) => state.runtime.timeline.toolbar.showWaveforms);

export const useShowThumbnails = () =>
    useEditorStore((state) => state.runtime.timeline.toolbar.showThumbnails);

// ===== Selection =====
export const useSelectionState = () =>
    useEditorStore((state) => state.runtime.selection);

export const useSelectedClipIds = () =>
    useEditorStore((state) => state.runtime.selection.selectedClipIds);

// ===== Text Editing =====
export const useTextEditingState = () =>
    useEditorStore((state) => state.runtime.textEditing);

// ===== Actions =====
export const useSetCurrentFrame = () =>
    useEditorStore((state) => state.setCurrentFrame);

export const useSetPlaybackStatus = () =>
    useEditorStore((state) => state.setPlaybackStatus);

export const usePlay = () => useEditorStore((state) => state.play);

export const usePause = () => useEditorStore((state) => state.pause);

export const useTogglePlay = () => useEditorStore((state) => state.togglePlay);

export const useSeekToFrame = () =>
    useEditorStore((state) => state.seekToFrame);

export const useSeekByFrames = () =>
    useEditorStore((state) => state.seekByFrames);

export const useSetMuted = () => useEditorStore((state) => state.setMuted);

export const useToggleMuted = () =>
    useEditorStore((state) => state.toggleMuted);

export const useSetPlaybackRate = () =>
    useEditorStore((state) => state.setPlaybackRate);

export const useSetPreviewContainerSize = () =>
    useEditorStore((state) => state.setPreviewContainerSize);

export const useSetPreviewZoom = () =>
    useEditorStore((state) => state.setPreviewZoom);

export const useSetPreviewMode = () =>
    useEditorStore((state) => state.setPreviewMode);

export const useSetTimelineZoomLevel = () =>
    useEditorStore((state) => state.setTimelineZoomLevel);

export const useZoomTimelineIn = () =>
    useEditorStore((state) => state.zoomTimelineIn);

export const useZoomTimelineOut = () =>
    useEditorStore((state) => state.zoomTimelineOut);

export const useSetTimelinePixelsPerFrame = () =>
    useEditorStore((state) => state.setTimelinePixelsPerFrame);

export const useSetTimelineViewportSize = () =>
    useEditorStore((state) => state.setTimelineViewportSize);

export const useSetTimelineScroll = () =>
    useEditorStore((state) => state.setTimelineScroll);

export const useToggleSnap = () => useEditorStore((state) => state.toggleSnap);

export const useToggleLoop = () => useEditorStore((state) => state.toggleLoop);

export const useToggleShowRuler = () =>
    useEditorStore((state) => state.toggleShowRuler);

export const useToggleShowWaveforms = () =>
    useEditorStore((state) => state.toggleShowWaveforms);

export const useToggleShowThumbnails = () =>
    useEditorStore((state) => state.toggleShowThumbnails);

export const useSetSelectedClipIds = () =>
    useEditorStore((state) => state.setSelectedClipIds);

export const useSetSelectedTrackId = () =>
    useEditorStore((state) => state.setSelectedTrackId);

export const useSetSelectedGroupId = () =>
    useEditorStore((state) => state.setSelectedGroupId);

export const useClearSelection = () =>
    useEditorStore((state) => state.clearSelection);

export const useAddTextClipAtPlayhead = () =>
    useEditorStore((state) => state.addTextClipAtPlayhead);

export const useAddMediaAssetAsClip = () =>
    useEditorStore((state) => state.addMediaAssetAsClip);

export const useStartTextEditing = () =>
    useEditorStore((state) => state.startTextEditing);

export const useUpdateTextDraft = () =>
    useEditorStore((state) => state.updateTextDraft);

export const useStopTextEditing = () =>
    useEditorStore((state) => state.stopTextEditing);

export const useSplitSelectedClipAtPlayhead = () =>
    useEditorStore((state) => state.splitSelectedClipAtPlayhead);

export const useDeleteSelectedClips = () =>
    useEditorStore((state) => state.deleteSelectedClips);

export const useUndo = () => useEditorStore((state) => state.undo);

export const useRedo = () => useEditorStore((state) => state.redo);
