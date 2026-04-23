import {
    AssetId,
    ClipId,
    Frame,
    Frames,
    HexColor,
    MediaSrc,
    ProjectId,
    TrackGroupId,
    TrackId,
} from "./primitives";

export type TrackMediaKind = "text" | "video" | "audio" | "image" | "shape";

export type MediaAssetKind = "video" | "audio" | "image";

export type AspectRatioPreset = "16:9" | "9:16" | "1:1" | "4:5" | "custom";

export type ProjectVideoConfig = {
    fps: number;
    width: number;
    height: number;
    durationInFrames: Frames;
    backgroundColor?: HexColor;
    aspectRatioPreset?: AspectRatioPreset;
};

export type TimelineTrackGroup = {
    id: TrackGroupId;
    label: string;
    kind: TrackMediaKind;
    trackIds: TrackId[];

    isCollapsed: boolean;
    isLocked: boolean;
    isMuted: boolean;
    isHidden: boolean;
};

export type TimelineTrack = {
    id: TrackId;
    groupId: TrackGroupId;
    label: string;
    kind: TrackMediaKind;

    index: number;
    height: number;

    isLocked: boolean;
    isMuted: boolean;
    isHidden: boolean;
};

export type ClipTransform = {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    opacity: number;

    width?: number;
    height?: number;
    anchorX?: number;
    anchorY?: number;
};

export type TimelineClipBase = {
    id: ClipId;
    trackId: TrackId;
    type: TrackMediaKind;

    from: Frame;
    durationInFrames: Frames;

    sourceStartFrame: Frame;

    label: string;
    color: HexColor;

    transform?: ClipTransform;

    isLocked: boolean;
    isHidden: boolean;
};

export type TextStyle = {
    fontFamily: string;
    fontSize: number;
    fontWeight?: number | string;
    fontStyle?: "normal" | "italic";
    lineHeight?: number;
    letterSpacing?: number;
    textAlign?: "left" | "center" | "right";
    textDecoration?: "none" | "underline" | "line-through";
    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
    color: HexColor;
    backgroundColor?: HexColor;
};

export type TextClip = TimelineClipBase & {
    type: "text";
    text: string;
    style: TextStyle;
};

export type VideoClip = TimelineClipBase & {
    type: "video";
    src: MediaSrc;
    sourceDurationInFrames: Frames;
    volume: number;
    playbackRate?: number;
    isMuted?: boolean;
    fadeInDurationInFrames?: Frames;
    fadeOutDurationInFrames?: Frames;
};

export type AudioClip = TimelineClipBase & {
    type: "audio";
    src: MediaSrc;
    sourceDurationInFrames: Frames;
    volume: number;
    playbackRate?: number;
    isMuted?: boolean;
    fadeInDurationInFrames?: Frames;
    fadeOutDurationInFrames?: Frames;
};

export type ImageClip = TimelineClipBase & {
    type: "image";
    src: MediaSrc;
    objectFit?: "contain" | "cover" | "fill";
};

export type ShapeType = "rectangle" | "circle";

export type ShapeClip = TimelineClipBase & {
    type: "shape";
    shapeType: ShapeType;
    fill: HexColor;
    stroke?: HexColor;
    strokeWidth?: number;
};

export type TimelineClip =
    | TextClip
    | VideoClip
    | AudioClip
    | ImageClip
    | ShapeClip;

export type MediaAsset = {
    id: AssetId;
    kind: MediaAssetKind;
    src: MediaSrc;
    name: string;
    mimeType: string;
    duration?: number;
    durationInFrames?: Frames;
    width?: number;
    height?: number;
};

export type EditorProject = {
    id: ProjectId;
    name: string;
    video: ProjectVideoConfig;

    trackGroups: TimelineTrackGroup[];
    tracks: TimelineTrack[];
    clips: TimelineClip[];
    mediaAssets: MediaAsset[];
};
