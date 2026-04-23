import type { EditorProject, Frames } from "../types";

export const getEditorPlaybackDurationInFrames = (
    project: EditorProject,
): Frames => {
    if (project.clips.length === 0) {
        // OLD logic: Empty projects used a fake 10s playback duration.
        // NEW logic: Empty projects stay at 0; ruler visibility is handled by timeline zoom.
        return 0;
    }

    const maxClipEnd = project.clips.reduce((maxEnd, clip) => {
        return Math.max(maxEnd, clip.from + clip.durationInFrames);
    }, 0);

    // OLD logic: Playback duration trusted project.video.durationInFrames, which could stay equal to the asset length.
    // NEW logic: Playback duration follows the real timeline end boundary, so offset clips extend the project correctly.
    return Math.max(project.video.durationInFrames, maxClipEnd);
};

export const getRemotionPlayerDurationInFrames = (
    playbackDurationInFrames: Frames,
): Frames => {
    // Remotion Player requires a positive duration even when the editor has no content.
    return Math.max(1, playbackDurationInFrames);
};
