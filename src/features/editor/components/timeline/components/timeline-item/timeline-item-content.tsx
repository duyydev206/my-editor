import { HiSpeakerWave, HiSpeakerXMark } from "react-icons/hi2";
import { BsType } from "react-icons/bs";
import { LuRectangleHorizontal } from "react-icons/lu";
import { FiImage } from "react-icons/fi";
import { RiMovie2Line } from "react-icons/ri";
import { TimelineClip } from "@/src/features/editor/types";

type TimelineItemContentProps = {
    clip: TimelineClip;
    isTrackMuted?: boolean;
};

const getKindIcon = (type: TimelineClip["type"]) => {
    switch (type) {
        case "text":
            return <BsType className='shrink-0 text-xs' />;
        case "shape":
            return <LuRectangleHorizontal className='shrink-0 text-xs' />;
        case "audio":
            return <HiSpeakerWave className='shrink-0 text-xs' />;
        case "video":
            return <RiMovie2Line className='shrink-0 text-xs' />;
        case "image":
            return <FiImage className='shrink-0 text-xs' />;
        default:
            return null;
    }
};

const TimelineItemContent: React.FC<TimelineItemContentProps> = ({
    clip,
    isTrackMuted = false,
}: TimelineItemContentProps) => {
    const background = clip.color;

    if (clip.type === "audio") {
        const muted = isTrackMuted || clip.isMuted;

        return (
            <div className='absolute h-full w-full'>
                <div
                    className='relative h-full w-full overflow-hidden'
                    style={{ background }}>
                    <div className='flex h-full w-full flex-nowrap gap-1 p-1 text-xs text-white'>
                        {muted ? (
                            <HiSpeakerXMark className='shrink-0 text-xs' />
                        ) : (
                            getKindIcon(clip.type)
                        )}
                        <span className='truncate'>{clip.label}</span>
                    </div>

                    <div className='absolute bottom-0 left-0 right-0 h-5 bg-black/10'>
                        <div className='absolute inset-y-1 left-0 right-0 opacity-40'>
                            <div className='absolute top-1/2 h-px w-full -translate-y-1/2 bg-white/30' />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (clip.type === "video" || clip.type === "image") {
        return (
            <div className='absolute h-full w-full'>
                <div
                    className='relative h-full w-full overflow-hidden'
                    style={{ background }}>
                    <div className='flex h-full w-full flex-nowrap gap-1 p-1 text-xs text-white'>
                        {getKindIcon(clip.type)}
                        <span className='truncate'>{clip.label}</span>
                    </div>

                    <div className='absolute inset-x-0 bottom-0 h-5 bg-black/10'>
                        <div className='absolute inset-0 opacity-30'>
                            <div className='flex h-full gap-0.5 px-1'>
                                {Array.from({ length: 12 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className='h-full flex-1 rounded-xs bg-white/20'
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (clip.type === "text") {
        return (
            <div className='absolute h-full w-full'>
                <div
                    className='flex h-full w-full flex-nowrap gap-1 p-1 text-xs text-white'
                    style={{ background }}>
                    {getKindIcon(clip.type)}
                    <span className='truncate'>{clip.text || clip.label}</span>
                </div>
            </div>
        );
    }

    return (
        <div className='absolute h-full w-full'>
            <div
                className='flex h-full w-full flex-nowrap gap-1 p-1 text-xs text-white'
                style={{ background }}>
                {getKindIcon(clip.type)}
                <span className='truncate'>{clip.label}</span>
            </div>
        </div>
    );
};

export default TimelineItemContent;
