"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { PlayerRef } from "@remotion/player";
import { PreviewViewportState } from "../../types/preview";
import { useElementSize } from "./hooks/use-element-size";
import { PreviewViewport } from "./components/preview-viewport";
import {
    useEditorStore,
    useLoopEnabled,
    usePreviewFullscreen,
} from "../../stores";
import { getEditorPlaybackDurationInFrames } from "../../lib/playback-duration";
import { PreviewSeekEvent } from "../../lib/preview-seek";

const EditorPlayer = () => {
    const playerRef = useRef<PlayerRef>(null);
    const { ref, size } = useElementSize<HTMLDivElement>();

    const project = useEditorStore((state) => state.project);
    const video = project.video;
    const playbackDurationInFrames =
        getEditorPlaybackDurationInFrames(project);
    const playbackStatus = useEditorStore(
        (state) => state.runtime.player.status,
    );
    const isLoopEnabled = useLoopEnabled();
    const isFullscreen = usePreviewFullscreen();
    const setCurrentFrame = useEditorStore((state) => state.setCurrentFrame);
    const setPlaybackStatus = useEditorStore(
        (state) => state.setPlaybackStatus,
    );
    const setPreviewContainerSize = useEditorStore(
        (state) => state.setPreviewContainerSize,
    );

    const handlePause = useCallback(() => {
        const currentFrameInPlayer = playerRef.current?.getCurrentFrame();
        const isEnded =
            currentFrameInPlayer !== undefined &&
            currentFrameInPlayer >= playbackDurationInFrames - 1;

        if (isEnded) {
            // OLD logic: The UI stayed on the last renderable frame, e.g. 04.96 for a 5s clip at 30fps.
            // NEW logic: The UI playhead moves to the end boundary while Remotion keeps rendering the final frame.
            setCurrentFrame(playbackDurationInFrames);
            setPlaybackStatus("ended");
            return;
        }

        setPlaybackStatus("paused");
    }, [playbackDurationInFrames, setCurrentFrame, setPlaybackStatus]);

    const handleFrameUpdate = useCallback((frame: number) => {
        const { runtime } = useEditorStore.getState();
        const isLastRenderableFrame = frame >= playbackDurationInFrames - 1;
        const isUiAtEndBoundary =
            runtime.player.currentFrame >= playbackDurationInFrames;

        if (
            isLastRenderableFrame &&
            (runtime.player.status === "ended" || isUiAtEndBoundary)
        ) {
            // OLD logic: Remotion frameupdate could pull the UI playhead back from duration to duration - 1.
            // NEW logic: Once the UI is on the end boundary, keep it there.
            return;
        }

        setCurrentFrame(frame);
    }, [playbackDurationInFrames, setCurrentFrame]);

    const handlePlay = useCallback(() => {
        setPlaybackStatus("playing");
    }, [setPlaybackStatus]);

    const viewport = useMemo<PreviewViewportState>(() => {
        return {
            containerWidth: size.width,
            containerHeight: size.height,
            zoom: 1,
            mode: "fit",
            isFullscreen: false,
        };
    }, [size.width, size.height]);

    useEffect(() => {
        setPreviewContainerSize({
            containerWidth: size.width,
            containerHeight: size.height,
        });
    }, [setPreviewContainerSize, size.width, size.height]);

    // Sync playback status từ store -> Remotion Player
    useEffect(() => {
        const instance = playerRef.current;
        if (!instance) return;

        if (playbackStatus === "playing") {
            const { runtime, project } = useEditorStore.getState();
            const playbackDuration =
                getEditorPlaybackDurationInFrames(project);
            const frameForPlayer = Math.min(
                runtime.player.currentFrame,
                Math.max(0, playbackDuration - 1),
            );

            if (instance.getCurrentFrame() !== frameForPlayer) {
                instance.seekTo(frameForPlayer);
            }

            if (!instance.isPlaying()) {
                instance.play();
            }
            return;
        }

        if (instance.isPlaying()) {
            instance.pause();
        }
    }, [playbackStatus, playbackDurationInFrames]);

    // Sync currentFrame từ store -> Remotion Player
    useEffect(() => {
        return useEditorStore.subscribe((state, previousState) => {
            const instance = playerRef.current;
            if (!instance) return;
            if (state.runtime.player.status === "playing") return;

            const currentFrameChanged =
                state.runtime.player.currentFrame !==
                previousState.runtime.player.currentFrame;
            const durationChanged =
                state.project.video.durationInFrames !==
                    previousState.project.video.durationInFrames ||
                state.project.clips.length !== previousState.project.clips.length;

            if (!currentFrameChanged && !durationChanged) return;

            const playbackDuration =
                getEditorPlaybackDurationInFrames(state.project);
            const currentFrameInPlayer = instance.getCurrentFrame();
            const frameForPlayer = Math.min(
                state.runtime.player.currentFrame,
                Math.max(0, playbackDuration - 1),
            );

            if (currentFrameInPlayer !== frameForPlayer) {
                // OLD logic: EditorPlayer subscribed to currentFrame and re-rendered the Player tree every frame.
                // NEW logic: External seeks sync imperatively so heavy video preview does not re-render each frame.
                instance.seekTo(frameForPlayer);
            }
        });
    }, []);

    useEffect(() => {
        const handlePreviewSeek = (event: Event) => {
            const instance = playerRef.current;
            if (!instance) return;

            const seekEvent = event as PreviewSeekEvent;
            const { project, runtime } = useEditorStore.getState();
            if (runtime.player.status === "playing") return;

            const playbackDuration =
                getEditorPlaybackDurationInFrames(project);
            const frameForPlayer = Math.min(
                seekEvent.detail.frame,
                Math.max(0, playbackDuration - 1),
            );

            if (instance.getCurrentFrame() === frameForPlayer) return;

            // OLD logic: Scrubbing waited for store updates before Preview could seek.
            // NEW logic: Timeline drag sends an animation-frame seek event directly to the Player.
            instance.seekTo(frameForPlayer);
        };

        window.addEventListener("editor:preview-seek-frame", handlePreviewSeek);

        return () => {
            window.removeEventListener(
                "editor:preview-seek-frame",
                handlePreviewSeek,
            );
        };
    }, []);

    return (
        <>
            {!isFullscreen ? (
                <div
                    ref={ref}
                    className='h-full w-full min-h-0 min-w-0 overflow-hidden'>
                    <PreviewViewport
                        playerRef={playerRef}
                        video={video}
                        playbackDurationInFrames={playbackDurationInFrames}
                        viewport={viewport}
                        isLoopEnabled={isLoopEnabled}
                        onFrameUpdate={handleFrameUpdate}
                        onPlay={handlePlay}
                        onPause={handlePause}
                    />
                </div>
            ) : (
                <div className='fixed inset-0 z-50 bg-black flex items-center justify-center'>
                    <div className='w-full h-full flex items-center justify-center'>
                        <PreviewViewport
                            playerRef={playerRef}
                            video={video}
                            playbackDurationInFrames={
                                playbackDurationInFrames
                            }
                            viewport={viewport}
                            isLoopEnabled={isLoopEnabled}
                            onFrameUpdate={handleFrameUpdate}
                            onPlay={handlePlay}
                            onPause={handlePause}
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default EditorPlayer;
