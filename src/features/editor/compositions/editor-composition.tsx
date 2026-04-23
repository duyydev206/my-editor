"use client";

import React, { useMemo } from "react";
import {
    AbsoluteFill,
    Audio,
    Img,
    Sequence,
    useCurrentFrame,
    useVideoConfig,
    Video,
} from "remotion";
import {
    AudioClip,
    EditorProject,
    ImageClip,
    TextClip,
    TimelineClip,
    TimelineTrack,
    VideoClip,
} from "../types";

type EditorPreviewCompositionProps = {
    project?: EditorProject;
};

const fallbackProject: EditorProject = {
    id: "demo-project",
    name: "Demo Project",
    video: {
        fps: 30,
        width: 1920,
        height: 1080,
        durationInFrames: 90,
        backgroundColor: "#000000",
        aspectRatioPreset: "16:9",
    },
    trackGroups: [],
    tracks: [
        {
            id: "track-text-1",
            groupId: "group-text",
            label: "Text Track",
            kind: "text",
            index: 0,
            height: 72,
            isLocked: false,
            isMuted: false,
            isHidden: false,
        },
    ],
    mediaAssets: [],
    clips: [
        {
            id: "clip-text-1",
            trackId: "track-text-1",
            type: "text",
            from: 0,
            durationInFrames: 60,
            sourceStartFrame: 0,
            label: "Hello World",
            color: "#3b82f6",
            layerIndex: 0,
            isLocked: false,
            isHidden: false,
            text: "Hello World",
            style: {
                fontFamily: "Inter, Arial, sans-serif",
                fontSize: 120,
                fontWeight: 700,
                textAlign: "center",
                color: "#ffffff",
            },
            transform: {
                x: 960,
                y: 540,
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
                opacity: 1,
                anchorX: 0.5,
                anchorY: 0.5,
            },
        },
    ],
};

const isClipVisibleAtFrame = (clip: TimelineClip, frame: number) => {
    return frame >= clip.from && frame < clip.from + clip.durationInFrames;
};

const getTrackIndexMap = (tracks: TimelineTrack[]) => {
    return new Map(tracks.map((track) => [track.id, track.index]));
};

const getClipLayerIndex = (clip: TimelineClip) => {
    return clip.layerIndex;
};

const sortVisualClipsForRender = (
    clips: TimelineClip[],
    tracks: TimelineTrack[],
) => {
    const trackIndexMap = getTrackIndexMap(tracks);

    return [...clips].sort((a, b) => {
        const aLayerIndex = getClipLayerIndex(a);
        const bLayerIndex = getClipLayerIndex(b);

        if (aLayerIndex !== bLayerIndex) {
            return aLayerIndex - bLayerIndex;
        }

        const aTrackIndex = trackIndexMap.get(a.trackId) ?? 0;
        const bTrackIndex = trackIndexMap.get(b.trackId) ?? 0;

        if (aTrackIndex !== bTrackIndex) {
            return aTrackIndex - bTrackIndex;
        }

        return a.from - b.from;
    });
};

const getClipLocalFrame = (clip: TimelineClip, frame: number) => {
    return frame - clip.from;
};

const getBasicClipTransitionStyle = (
    clip: TimelineClip,
    localFrame: number,
    fps: number,
) => {
    void clip;
    void localFrame;
    void fps;

    // OLD logic: Every clip had a built-in fade/translate/scale transition.
    // NEW logic: Clips render statically by default; custom effects will be modeled explicitly later.
    return {
        opacity: 1,
        translateY: 0,
        scale: 1,
    };
};

const TextClipLayer: React.FC<{
    clip: TextClip;
    frame: number;
    trackOrder: number;
}> = ({ clip, frame, trackOrder }) => {
    const { fps } = useVideoConfig();
    const localFrame = getClipLocalFrame(clip, frame);
    const transition = getBasicClipTransitionStyle(clip, localFrame, fps);

    const transform = clip.transform ?? {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
        anchorX: 0.5,
        anchorY: 0.5,
    };

    return (
        <div
            style={{
                position: "absolute",
                left: transform.x,
                top: transform.y,
                transform: `
          translate(-50%, -50%)
          translateY(${transition.translateY}px)
          rotate(${transform.rotation}deg)
          scale(${transform.scaleX * transition.scale}, ${transform.scaleY * transition.scale})
        `,
                opacity: (transform.opacity ?? 1) * transition.opacity,
                zIndex: trackOrder,
                whiteSpace: "pre-wrap",
                textAlign: clip.style.textAlign ?? "center",
                color: clip.style.color,
                backgroundColor: clip.style.backgroundColor,
                fontFamily: clip.style.fontFamily,
                fontSize: clip.style.fontSize,
                fontWeight: clip.style.fontWeight,
                fontStyle: clip.style.fontStyle,
                lineHeight: clip.style.lineHeight,
                letterSpacing: clip.style.letterSpacing,
                textDecoration: clip.style.textDecoration,
                textTransform: clip.style.textTransform,
                userSelect: "none",
            }}>
            {clip.text}
        </div>
    );
};

const VideoClipLayer: React.FC<{
    clip: VideoClip;
    frame: number;
    trackOrder: number;
    isTrackMuted: boolean;
}> = ({ clip, frame, trackOrder, isTrackMuted }) => {
    const { fps } = useVideoConfig();
    const localFrame = getClipLocalFrame(clip, frame);
    const transition = getBasicClipTransitionStyle(clip, localFrame, fps);

    const transform = clip.transform ?? {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
        anchorX: 0.5,
        anchorY: 0.5,
    };

    return (
        <div
            style={{
                position: "absolute",
                left: transform.x,
                top: transform.y,
                transform: `
          translate(-${(transform.anchorX ?? 0.5) * 100}%, -${(transform.anchorY ?? 0.5) * 100}%)
          translateY(${transition.translateY}px)
          rotate(${transform.rotation}deg)
          scale(${transform.scaleX * transition.scale}, ${transform.scaleY * transition.scale})
        `,
                opacity: (transform.opacity ?? 1) * transition.opacity,
                zIndex: trackOrder,
                width: transform.width,
                height: transform.height,
            }}>
            <Video
                src={clip.src}
                startFrom={clip.sourceStartFrame}
                endAt={clip.sourceStartFrame + clip.durationInFrames}
                volume={clip.isMuted || isTrackMuted ? 0 : clip.volume}
                playbackRate={clip.playbackRate ?? 1}
                // OLD logic: Video used "contain", which could leave black space around uploaded media.
                // NEW logic: Uploaded video fills its clip bounds by default.
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
        </div>
    );
};

const ImageClipLayer: React.FC<{
    clip: ImageClip;
    frame: number;
    trackOrder: number;
}> = ({ clip, frame, trackOrder }) => {
    const { fps } = useVideoConfig();
    const localFrame = getClipLocalFrame(clip, frame);
    const transition = getBasicClipTransitionStyle(clip, localFrame, fps);

    const transform = clip.transform ?? {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
        anchorX: 0.5,
        anchorY: 0.5,
    };

    return (
        <div
            style={{
                position: "absolute",
                left: transform.x,
                top: transform.y,
                transform: `
          translate(-${(transform.anchorX ?? 0.5) * 100}%, -${(transform.anchorY ?? 0.5) * 100}%)
          translateY(${transition.translateY}px)
          rotate(${transform.rotation}deg)
          scale(${transform.scaleX * transition.scale}, ${transform.scaleY * transition.scale})
        `,
                opacity: (transform.opacity ?? 1) * transition.opacity,
                zIndex: trackOrder,
                width: transform.width,
                height: transform.height,
            }}>
            <Img
                src={clip.src}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: clip.objectFit ?? "contain",
                }}
            />
        </div>
    );
};

const AudioClipLayer: React.FC<{
    clip: AudioClip;
    isTrackMuted: boolean;
}> = ({ clip, isTrackMuted }) => {
    return (
        <Audio
            src={clip.src}
            startFrom={clip.sourceStartFrame}
            endAt={clip.sourceStartFrame + clip.durationInFrames}
            volume={clip.isMuted || isTrackMuted ? 0 : clip.volume}
            playbackRate={clip.playbackRate ?? 1}
        />
    );
};

const EmptyPreviewState: React.FC = () => {
    return (
        <AbsoluteFill
            style={{
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(253, 245, 245, 0.72)",
                fontFamily: "Inter, Arial, sans-serif",
                fontSize: 120,
                fontWeight: 500,
                textAlign: "center",
                userSelect: "none",
            }}>
            <h1 className='px-10'>
                Drop videos and images here to get started
            </h1>
        </AbsoluteFill>
    );
};

const EditorPreviewComposition: React.FC<EditorPreviewCompositionProps> = ({
    project = fallbackProject,
}) => {
    const frame = useCurrentFrame();
    const { width, height, fps } = useVideoConfig();

    const visibleSortedClips = useMemo(() => {
        const trackMap = new Map(project.tracks.map((track) => [track.id, track]));
        const visible = project.clips.filter((clip) => {
            const track = trackMap.get(clip.trackId);

            // OLD logic: Preview only respected clip.isHidden.
            // NEW logic: Track hide state hides all clips in that lane from Preview.
            return (
                !clip.isHidden &&
                !track?.isHidden &&
                isClipVisibleAtFrame(clip, frame)
            );
        });

        return sortVisualClipsForRender(visible, project.tracks);
    }, [frame, project.clips, project.tracks]);

    const trackMap = useMemo(() => {
        return new Map(project.tracks.map((track) => [track.id, track]));
    }, [project.tracks]);

    return (
        <AbsoluteFill
            style={{
                background: project.video.backgroundColor ?? "#000",
                width,
                height,
                overflow: "hidden",
            }}>
            {project.clips.length === 0 && <EmptyPreviewState />}

            {visibleSortedClips.map((clip) => {
                const trackOrder = getClipLayerIndex(clip);
                const track = trackMap.get(clip.trackId);
                const isTrackMuted = track?.isMuted ?? false;
                let clipLayer: React.ReactNode = null;

                switch (clip.type) {
                    case "text":
                        clipLayer = (
                            <TextClipLayer
                                clip={clip}
                                frame={frame}
                                trackOrder={trackOrder}
                            />
                        );
                        break;

                    case "video":
                        clipLayer = (
                            <VideoClipLayer
                                clip={clip}
                                frame={frame}
                                trackOrder={trackOrder}
                                isTrackMuted={isTrackMuted}
                            />
                        );
                        break;

                    case "image":
                        clipLayer = (
                            <ImageClipLayer
                                clip={clip}
                                frame={frame}
                                trackOrder={trackOrder}
                            />
                        );
                        break;

                    case "audio":
                        clipLayer = (
                            <AudioClipLayer
                                clip={clip}
                                isTrackMuted={isTrackMuted}
                            />
                        );
                        break;

                    default:
                        clipLayer = null;
                        break;
                }

                if (!clipLayer) {
                    return null;
                }

                return (
                    <Sequence
                        key={clip.id}
                        from={clip.from}
                        durationInFrames={clip.durationInFrames}
                        style={{
                            pointerEvents: "none",
                        }}>
                        {/* OLD logic: Clip visibility was filtered by timeline frame, but media still rendered on the global composition frame.
                            NEW logic: Each clip now renders inside a Remotion Sequence so source timing starts at clip.from. */}
                        {clipLayer}
                    </Sequence>
                );
            })}
            <span className='p-1 text-end text-white'>
                {width} x {height} • {fps} FPS • Frame {frame}
            </span>
        </AbsoluteFill>
    );
};

export default EditorPreviewComposition;
