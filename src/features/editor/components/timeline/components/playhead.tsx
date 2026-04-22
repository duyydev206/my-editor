import { Frame, Frames } from "@/src/features/editor/types/primitives";
import {
    TIMELINE_GUTTER_X,
    frameToPx,
} from "@/src/features/editor/lib/timeline-math";

type PlayheadProps = {
    currentFrame: Frame;
    durationInFrames: Frames;
    pixelsPerFrame: number;
};

const Playhead: React.FC<PlayheadProps> = ({
    currentFrame,
    durationInFrames,
    pixelsPerFrame,
}: PlayheadProps) => {
    const clampedFrame = Math.min(Math.max(currentFrame, 0), durationInFrames);
    const left = frameToPx(clampedFrame, pixelsPerFrame, TIMELINE_GUTTER_X);

    return (
        <div
            className='pointer-events-none absolute top-0 flex h-full flex-col items-center -ml-2.5'
            id='playhead'
            style={{ left }}>
            <div className='sticky z-1 top-0'>
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
                        style={{ fill: "#fff" }}
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
};

export default Playhead;
