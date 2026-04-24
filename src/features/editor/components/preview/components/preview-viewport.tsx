"use client";

import React, { useMemo } from "react";
import type { PlayerRef } from "@remotion/player";
import { ProjectVideoConfig } from "../../../types";
import { PreviewViewportState } from "../../../types/preview";
import { getPreviewSurfaceLayout } from "../../../lib/get-preview-surface-layout";
import PreviewStage from "./preview-stage";

type PreviewViewportProps = {
    playerRef: React.RefObject<PlayerRef | null>;
    video: ProjectVideoConfig;
    playbackDurationInFrames: number;
    viewport: PreviewViewportState;
    isLoopEnabled: boolean;
    onFrameUpdate: (frame: number) => void;
    onPlay: () => void;
    onPause: () => void;
};

export const PreviewViewport: React.FC<PreviewViewportProps> = ({
    playerRef,
    video,
    playbackDurationInFrames,
    viewport,
    isLoopEnabled,
    onFrameUpdate,
    onPlay,
    onPause,
}) => {
    const layout = useMemo(() => {
        return getPreviewSurfaceLayout({
            containerWidth: viewport.containerWidth,
            containerHeight: viewport.containerHeight,
            compositionWidth: video.width,
            compositionHeight: video.height,
            zoom: viewport.zoom,
            mode: viewport.mode,
            padding: 24,
        });
    }, [
        video.width,
        video.height,
        viewport.containerWidth,
        viewport.containerHeight,
        viewport.zoom,
        viewport.mode,
    ]);

    return (
        <div className='relative h-full w-full min-h-0 min-w-0 overflow-hidden'>
            <div
                className='absolute'
                style={{
                    left: layout.offsetX,
                    top: layout.offsetY,
                    width: layout.renderedWidth,
                    height: layout.renderedHeight,
                }}>
                <PreviewStage
                    playerRef={playerRef}
                    video={video}
                    playbackDurationInFrames={playbackDurationInFrames}
                    width={layout.renderedWidth}
                    height={layout.renderedHeight}
                    onFrameUpdate={onFrameUpdate}
                    onPlay={onPlay}
                    onPause={onPause}
                    isLoopEnabled={isLoopEnabled}
                />
            </div>
        </div>
    );
};
