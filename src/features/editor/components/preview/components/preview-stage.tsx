"use client";

import React, { useEffect } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { ProjectVideoConfig } from "../../../types";
import { useEditorStore } from "../../../stores";
import EditorPreviewComposition from "../../../compositions/editor-composition";

type PreviewStageProps = {
    playerRef: React.RefObject<PlayerRef | null>;
    video: ProjectVideoConfig;
    width: number;
    height: number;
    isLoopEnabled: boolean;
    onFrameUpdate: (frame: number) => void;
    onPlay: () => void;
    onPause: () => void;
};

const PreviewStage: React.FC<PreviewStageProps> = ({
    playerRef,
    video,
    width,
    height,
    isLoopEnabled,
    onFrameUpdate,
    onPlay,
    onPause,
}) => {
    const project = useEditorStore((state) => state.project);

    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        const handleFrameUpdate = () => {
            onFrameUpdate(player.getCurrentFrame());
        };

        const handlePlay = () => {
            onPlay();
        };

        const handlePause = () => {
            onPause();
        };

        player.addEventListener("frameupdate", handleFrameUpdate);
        player.addEventListener("play", handlePlay);
        player.addEventListener("pause", handlePause);

        return () => {
            player.removeEventListener("frameupdate", handleFrameUpdate);
            player.removeEventListener("play", handlePlay);
            player.removeEventListener("pause", handlePause);
        };
    }, [onFrameUpdate, onPlay, onPause, playerRef]);

    return (
        <div
            className='relative overflow-hidden'
            style={{
                width,
                height,
            }}>
            <Player
                ref={playerRef}
                component={EditorPreviewComposition}
                // OLD logic: inputProps={{}}
                // NEW logic: Pass actual projected data from global store into Player
                inputProps={{ project }}
                durationInFrames={video.durationInFrames}
                fps={video.fps}
                compositionWidth={video.width}
                compositionHeight={video.height}
                controls={false        }
                autoPlay={false}
                loop={isLoopEnabled}
                style={{
                    width: "100%",
                    height: "100%",
                }}
                acknowledgeRemotionLicense
            />
        </div>
    );
};

export default PreviewStage;
