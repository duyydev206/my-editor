export type PreviewSeekEvent = CustomEvent<{
    frame: number;
}>;

export const dispatchPreviewSeekFrame = (frame: number) => {
    const event: PreviewSeekEvent = new CustomEvent(
        "editor:preview-seek-frame",
        {
            detail: { frame },
        },
    );

    window.dispatchEvent(event);
};
