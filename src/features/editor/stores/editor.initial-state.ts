import { TimelineClip, TimelineTrack, TimelineTrackGroup } from "../types";
import { EditorState } from "../types/editor";

const TRACK_GROUPS: TimelineTrackGroup[] = [
    {
        id: "group-text",
        label: "Text",
        kind: "text",
        trackIds: ["track-1", "track-2"],
        isCollapsed: false,
        isLocked: false,
        isMuted: false,
        isHidden: false,
    },
    {
        id: "group-media",
        label: "Media",
        kind: "video",
        trackIds: ["track-3", "track-4"],
        isCollapsed: false,
        isLocked: false,
        isMuted: false,
        isHidden: false,
    },
];

const TRACKS: TimelineTrack[] = [
    // {
    //     id: "track-1",
    //     groupId: "group-text",
    //     label: "Title",
    //     kind: "text",
    //     index: 0,
    //     height: 35,
    //     isLocked: false,
    //     isMuted: false,
    //     isHidden: false,
    // },
    // {
    //     id: "track-2",
    //     groupId: "group-text",
    //     label: "Subtitle",
    //     kind: "text",
    //     index: 1,
    //     height: 35,
    //     isLocked: false,
    //     isMuted: false,
    //     isHidden: false,
    // },
    // {
    //     id: "track-3",
    //     groupId: "group-media",
    //     label: "Audio",
    //     kind: "audio",
    //     index: 2,
    //     height: 71,
    //     isLocked: false,
    //     isMuted: false,
    //     isHidden: false,
    // },
    // {
    //     id: "track-4",
    //     groupId: "group-media",
    //     label: "Video",
    //     kind: "video",
    //     index: 3,
    //     height: 71,
    //     isLocked: false,
    //     isMuted: false,
    //     isHidden: false,
    // },
];

const CLIPS: TimelineClip[] = [
    // {
    //     id: "clip-1",
    //     trackId: "track-1",
    //     type: "text",
    //     from: 0,
    //     durationInFrames: 60,
    //     sourceStartFrame: 0,
    //     label: "Edit this video",
    //     color: "rgb(122, 93, 232)",
    //     isLocked: false,
    //     isHidden: false,
    //     text: "Edit this video",
    //     style: {
    //         fontFamily: "Inter",
    //         fontSize: 14,
    //         color: "#ffffff",
    //     },
    // },
    // {
    //     id: "clip-2",
    //     trackId: "track-2",
    //     type: "text",
    //     from: 60,
    //     durationInFrames: 30,
    //     sourceStartFrame: 0,
    //     label: "Demo",
    //     color: "rgb(122, 93, 232)",
    //     isLocked: false,
    //     isHidden: false,
    //     text: "Demo",
    //     style: {
    //         fontFamily: "Inter",
    //         fontSize: 14,
    //         color: "#ffffff",
    //     },
    // },
    // {
    //     id: "clip-3",
    //     trackId: "track-3",
    //     type: "audio",
    //     from: 90,
    //     durationInFrames: 60,
    //     sourceStartFrame: 0,
    //     label: "Voice over",
    //     color: "rgb(58, 122, 68)",
    //     isLocked: false,
    //     isHidden: false,
    //     src: "/audio/voice.mp3",
    //     sourceDurationInFrames: 360,
    //     volume: 1,
    // },
    // {
    //     id: "clip-4",
    //     trackId: "track-4",
    //     type: "video",
    //     from: 150,
    //     durationInFrames: 60,
    //     sourceStartFrame: 0,
    //     label: "Main footage",
    //     color: "rgb(61, 94, 201)",
    //     isLocked: false,
    //     isHidden: false,
    //     src: "/video/main.mp4",
    //     sourceDurationInFrames: 360,
    //     volume: 1,
    // },
];

const getProjectDurationInFrames = (clips: TimelineClip[]) => {
    // OLD logic: Empty projects started at 60 frames.
    // NEW logic: Project duration represents real content length; timeline padding is handled by the timeline zoom layer.
    if (clips.length === 0) return 1;

    const maxClipEnd = clips.reduce((maxEnd, clip) => {
        return Math.max(maxEnd, clip.from + clip.durationInFrames);
    }, 0);

    return Math.max(1, maxClipEnd);
};

export const INITIAL_EDITOR_STATE: EditorState = {
    project: {
        id: "project-1",
        name: "Untitled Project",
        video: {
            fps: 30,
            width: 1920,
            height: 1080,
            durationInFrames: getProjectDurationInFrames(CLIPS),
            backgroundColor: "#000000",
            aspectRatioPreset: "16:9",
        },
        trackGroups: TRACK_GROUPS,
        tracks: TRACKS,
        clips: CLIPS,
        mediaAssets: [],
    },

    runtime: {
        player: {
            currentFrame: 0,
            status: "idle",
            isMuted: false,
            playbackRate: 1,
        },

        preview: {
            containerWidth: 0,
            containerHeight: 0,
            zoom: 1,
            mode: "fit",
            isFullscreen: false,
        },

        timeline: {
            zoom: {
                zoomLevel: 1,
                minZoomLevel: 1,
                maxZoomLevel: 10,
                pixelsPerFrame: 10,
            },
            viewport: {
                scrollLeft: 0,
                scrollTop: 0,
                viewportWidth: 0,
                viewportHeight: 0,
            },
            toolbar: {
                snapEnabled: true,
                showRuler: true,
                showWaveforms: true,
                showThumbnails: true,
                isLoopEnabled: false,
            },
        },

        selection: {
            selectedClipIds: [],
            selectedTrackId: null,
            selectedGroupId: null,
        },

        interaction: {
            type: "idle",
        },

        textEditing: {
            editingClipId: null,
            draftText: "",
            isEditing: false,
        },
    },
};
