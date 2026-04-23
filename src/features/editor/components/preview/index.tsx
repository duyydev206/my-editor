"use client";

import { useEffect, useMemo, useRef } from "react";
import type { PlayerRef } from "@remotion/player";
import { PreviewViewportState } from "../../types/preview";
import { useElementSize } from "./hooks/use-element-size";
import { PreviewViewport } from "./components/preview-viewport";
import {
    useEditorStore,
    useLoopEnabled,
    usePreviewFullscreen,
} from "../../stores";

const EditorPlayer = () => {
    const playerRef = useRef<PlayerRef>(null);
    const { ref, size } = useElementSize<HTMLDivElement>();

    const video = useEditorStore((state) => state.project.video);
    const player = useEditorStore((state) => state.runtime.player);
    const isLoopEnabled = useLoopEnabled();
    const isFullscreen = usePreviewFullscreen();
    const setCurrentFrame = useEditorStore((state) => state.setCurrentFrame);
    const setPlaybackStatus = useEditorStore(
        (state) => state.setPlaybackStatus,
    );
    const setPreviewContainerSize = useEditorStore(
        (state) => state.setPreviewContainerSize,
    );

    const handlePause = () => {
        const currentFrameInPlayer = playerRef.current?.getCurrentFrame();
        const isEnded =
            currentFrameInPlayer !== undefined &&
            currentFrameInPlayer >= video.durationInFrames - 1;

        if (isEnded) {
            // OLD logic: The UI stayed on the last renderable frame, e.g. 04.96 for a 5s clip at 30fps.
            // NEW logic: The UI playhead moves to the end boundary while Remotion keeps rendering the final frame.
            setCurrentFrame(video.durationInFrames);
            setPlaybackStatus("ended");
            return;
        }

        setPlaybackStatus("paused");
    };

    const handleFrameUpdate = (frame: number) => {
        const { runtime } = useEditorStore.getState();
        const isLastRenderableFrame = frame >= video.durationInFrames - 1;
        const isUiAtEndBoundary =
            runtime.player.currentFrame >= video.durationInFrames;

        if (
            isLastRenderableFrame &&
            (runtime.player.status === "ended" || isUiAtEndBoundary)
        ) {
            // OLD logic: Remotion frameupdate could pull the UI playhead back from duration to duration - 1.
            // NEW logic: Once the UI is on the end boundary, keep it there.
            return;
        }

        setCurrentFrame(frame);
    };

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

        if (player.status === "playing") {
            if (!instance.isPlaying()) {
                instance.play();
            }
            return;
        }

        if (instance.isPlaying()) {
            instance.pause();
        }
    }, [player.status]);

    // Sync currentFrame từ store -> Remotion Player
    useEffect(() => {
        const instance = playerRef.current;
        if (!instance) return;

        const currentFrameInPlayer = instance.getCurrentFrame();
        const frameForPlayer = Math.min(
            player.currentFrame,
            Math.max(0, video.durationInFrames - 1),
        );

        if (currentFrameInPlayer !== frameForPlayer) {
            // OLD logic: UI frame and Remotion seek frame were always identical.
            // NEW logic: UI can sit on the end boundary; Remotion still seeks to the last real frame.
            instance.seekTo(frameForPlayer);
        }
    }, [player.currentFrame, video.durationInFrames]);

    return (
        <>
            {!isFullscreen ? (
                <div
                    ref={ref}
                    className='h-full w-full min-h-0 min-w-0 overflow-hidden'>
                    <PreviewViewport
                        playerRef={playerRef}
                        video={video}
                        viewport={viewport}
                        isLoopEnabled={isLoopEnabled}
                        onFrameUpdate={handleFrameUpdate}
                        onPlay={() => {
                            setPlaybackStatus("playing");
                        }}
                        onPause={handlePause}
                    />
                </div>
            ) : (
                <div className='fixed inset-0 z-50 bg-black flex items-center justify-center'>
                    <div className='w-full h-full flex items-center justify-center'>
                        <PreviewViewport
                            playerRef={playerRef}
                            video={video}
                            viewport={viewport}
                            isLoopEnabled={isLoopEnabled}
                            onFrameUpdate={handleFrameUpdate}
                            onPlay={() => {
                                setPlaybackStatus("playing");
                            }}
                            onPause={handlePause}
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default EditorPlayer;
