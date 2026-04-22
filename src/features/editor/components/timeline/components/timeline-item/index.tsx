import { TimelineClipLayout } from "@/src/features/editor/lib/build-clip-layouts";
import TimelineItemContent from "./timeline-item-content";
import TimelineItemResizeHandle from "./timeline-item-resize-handle";
import TimelineItemShell from "./timeline-item-shell";

type TimelineItemProps = {
    clipLayout: TimelineClipLayout;
    isSelected?: boolean;
};

const TimelineItem: React.FC<TimelineItemProps> = ({
    clipLayout,
    isSelected = false,
}: TimelineItemProps) => {
    const {
        clip,
        left,
        top,
        width,
        height,
        resizeHandleWidth,
        isTrackLocked,
        isTrackHidden,
        isTrackMuted,
    } = clipLayout;

    return (
        <div
            className='relative'
            data-hidden={isTrackHidden || clip.isHidden}
            style={{ opacity: isTrackHidden || clip.isHidden ? 0.45 : 1 }}>
            <div data-state='closed' style={{ display: "contents" }}>
                <div
                    style={{
                        width,
                        left,
                        top,
                        height,
                        position: "absolute",
                    }}>
                    <TimelineItemShell
                        isLocked={isTrackLocked || clip.isLocked}
                        isSelected={isSelected}>
                        <TimelineItemContent
                            clip={clip}
                            isTrackMuted={isTrackMuted}
                        />
                    </TimelineItemShell>

                    {!isTrackLocked && !clip.isLocked && (
                        <>
                            <TimelineItemResizeHandle
                                side='start'
                                width={resizeHandleWidth}
                            />
                            <TimelineItemResizeHandle
                                side='end'
                                width={resizeHandleWidth}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimelineItem;
