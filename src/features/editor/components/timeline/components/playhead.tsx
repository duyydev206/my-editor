import { forwardRef, type PointerEvent } from "react";
import { Frame, Frames } from "@/src/features/editor/types/primitives";
import {
    TIMELINE_GUTTER_X,
    frameToPx,
} from "@/src/features/editor/lib/timeline-math";

type PlayheadProps = {
    currentFrame: Frame;
    durationInFrames: Frames;
    pixelsPerFrame: number;
    isPlaying?: boolean;
    leftOffset?: number;
    onScrubStart?: (event: PointerEvent<HTMLDivElement>) => void;
    onScrubMove?: (event: PointerEvent<HTMLDivElement>) => void;
    onScrubEnd?: (event: PointerEvent<HTMLDivElement>) => void;
};

const Playhead = forwardRef<HTMLDivElement, PlayheadProps>(
    (
        {
            currentFrame,
            durationInFrames,
            pixelsPerFrame,
            isPlaying = false,
            leftOffset,
            onScrubStart,
            onScrubMove,
            onScrubEnd,
        }: PlayheadProps,
        ref,
    ) => {
        const clampedFrame = Math.min(
            Math.max(currentFrame, 0),
            durationInFrames,
        );
        const left =
            leftOffset ??
            frameToPx(clampedFrame, pixelsPerFrame, TIMELINE_GUTTER_X);

        return (
            <div
                ref={ref}
                className='pointer-events-none absolute top-0 flex flex-col items-center -ml-2.5'
                id='playhead'
                style={{
                    left: 0,
                    transform: `translate3d(${left}px, 0, 0)`,
                    // OLD logic: The playhead carried its own very high z-index and could break the timeline stacking order.
                    // NEW logic: The viewport layer controls stacking; the playhead only needs a local baseline.
                    zIndex: 1,
                    // OLD logic: Playhead jumped frame-by-frame with no visual interpolation.
                    // NEW logic: Use composited transform updates with a short linear transition for smoother playback.
                    transition: isPlaying ? "transform 40ms linear" : undefined,
                    willChange: isPlaying ? "transform" : undefined,
                }}>
                <div
                    className='sticky z-1 top-0 pointer-events-auto cursor-pointer'
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        onScrubStart?.(event);
                    }}
                    onPointerMove={(event) => {
                        if (event.buttons !== 1) return;

                        onScrubMove?.(event);
                    }}
                    onPointerUp={onScrubEnd}
                    onPointerCancel={onScrubEnd}>
                    <svg
                        viewBox='0 0 54 55'
                        fill='none'
                        style={{
                            width: "19px",
                            aspectRatio: "54 / 55",
                            overflow: "visible",
                            marginTop: "-1px",
                        }}>
                        <path
                            d='M50.4313 37.0917 L30.4998 51.4424 L 30.4998 1691.337136842105 L 25 1691.337136842105 L 25 51.4424 L3.73299 37.0763C2.65291 36.382 2 35.1861 2 33.9021V5.77359C2 3.68949 3.68949 2 5.77358 2H48.2264C50.3105 2 52 3.68949 52 5.77358V34.0293C52 35.243 51.4163 36.3826 50.4313 37.0917Z'
                            style={{ fill: "#fff", height: "100%" }}
                            strokeWidth='3'
                            stroke='black'
                            strokeLinejoin='round'
                            strokeLinecap='round'
                            strokeOpacity='1'
                        />
                    </svg>
                </div>
            </div>
        );
    },
);

Playhead.displayName = "Playhead";

export default Playhead;
