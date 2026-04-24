import { Button } from "antd";
import { TimelineTrack } from "@/src/features/editor/types";
import { HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2";
import { HiSpeakerWave, HiSpeakerXMark } from "react-icons/hi2";
import { useEditorStore } from "@/src/features/editor/stores";

type TimelineTrackHeaderRowProps = {
    track: TimelineTrack;
    laneHeight: number;
    displayIndex: number;
};

const TimelineTrackHeaderRow: React.FC<TimelineTrackHeaderRowProps> = ({
    track,
    laneHeight,
    displayIndex,
}: TimelineTrackHeaderRowProps) => {
    const isHidden = track.isHidden;
    const isMuted = track.isMuted;
    const toggleTrackHidden = useEditorStore(
        (state) => state.toggleTrackHidden,
    );
    const toggleTrackMuted = useEditorStore((state) => state.toggleTrackMuted);

    return (
        <div
            className='flex w-full select-none border-black/20'
            style={{ borderBottomWidth: 1, height: laneHeight }}>
            <div className='group flex w-full shrink-0 items-center gap-2 truncate pl-4 text-xs bg-white'>
                {/* Track index */}
                <div className='w-4 text-right text-neutral-400'>
                    {displayIndex}
                </div>

                {/* Action buttons */}
                <div className='flex items-center'>
                    <Button
                        type='text'
                        size='small'
                        aria-label={isHidden ? "Show Track" : "Hide Track"}
                        aria-pressed={isHidden}
                        className='flex items-center gap-1 rounded-sm p-1 hover:bg-black/5'
                        onClick={(event) => {
                            event.stopPropagation();
                            toggleTrackHidden(track.id);
                        }}
                        icon={
                            isHidden ? (
                                <HiOutlineEyeSlash className='size-4 text-neutral-400 hover:text-black' />
                            ) : (
                                <HiOutlineEye className='size-4 text-neutral-400 hover:text-black' />
                            )
                        }
                    />

                    <Button
                        type='text'
                        size='small'
                        aria-label={isMuted ? "Unmute Track" : "Mute Track"}
                        aria-pressed={isMuted}
                        className='flex items-center gap-1 rounded-sm p-1 hover:bg-black/5'
                        onClick={(event) => {
                            event.stopPropagation();
                            toggleTrackMuted(track.id);
                        }}
                        icon={
                            isMuted ? (
                                <HiSpeakerXMark className='size-4 text-neutral-400 hover:text-black' />
                            ) : (
                                <HiSpeakerWave className='size-4 text-neutral-400 hover:text-black' />
                            )
                        }
                    />
                </div>
            </div>
        </div>
    );
};

export default TimelineTrackHeaderRow;
