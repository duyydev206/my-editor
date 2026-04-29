import type { MediaAsset, MediaAssetKind } from "../types";

const getMediaAssetKind = (file: File): MediaAssetKind | null => {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type.startsWith("image/")) return "image";

    return null;
};

const createAssetId = (kind: MediaAssetKind) => {
    return `asset-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getDurationInFrames = (duration: number, fps: number) => {
    if (!Number.isFinite(duration) || duration <= 0) return undefined;

    return Math.max(1, Math.ceil(duration * fps));
};

const readImageMetadata = (
    src: string,
): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => {
            resolve({
                width: image.naturalWidth,
                height: image.naturalHeight,
            });
        };
        image.onerror = () => {
            reject(new Error("Unable to read image metadata"));
        };
        image.src = src;
    });
};

const readVideoMetadata = (
    src: string,
): Promise<{ duration?: number; width?: number; height?: number }> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");

        video.preload = "metadata";
        video.onloadedmetadata = () => {
            resolve({
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
            });
        };
        video.onerror = () => {
            reject(new Error("Unable to read video metadata"));
        };
        video.src = src;
    });
};

const readAudioMetadata = (src: string): Promise<{ duration?: number }> => {
    return new Promise((resolve, reject) => {
        const audio = document.createElement("audio");

        audio.preload = "metadata";
        audio.onloadedmetadata = () => {
            resolve({
                duration: audio.duration,
            });
        };
        audio.onerror = () => {
            reject(new Error("Unable to read audio metadata"));
        };
        audio.src = src;
    });
};

export const createMediaAssetFromFile = async (
    file: File,
    fps: number,
): Promise<MediaAsset | null> => {
    const kind = getMediaAssetKind(file);

    if (!kind) return null;

    const src = URL.createObjectURL(file);

    try {
        if (kind === "image") {
            const metadata = await readImageMetadata(src);

            return {
                id: createAssetId(kind),
                kind,
                src,
                name: file.name,
                mimeType: file.type,
                width: metadata.width,
                height: metadata.height,
            };
        }

        if (kind === "video") {
            const metadata = await readVideoMetadata(src);

            return {
                id: createAssetId(kind),
                kind,
                src,
                name: file.name,
                mimeType: file.type,
                duration: metadata.duration,
                durationInFrames: metadata.duration
                    ? getDurationInFrames(metadata.duration, fps)
                    : undefined,
                width: metadata.width,
                height: metadata.height,
            };
        }

        const metadata = await readAudioMetadata(src);

        return {
            id: createAssetId(kind),
            kind,
            src,
            name: file.name,
            mimeType: file.type,
            duration: metadata.duration,
            durationInFrames: metadata.duration
                ? getDurationInFrames(metadata.duration, fps)
                : undefined,
        };
    } catch (error) {
        URL.revokeObjectURL(src);
        throw error;
    }
};
