"use client";

import { Button, Slider } from "antd";
import type { SliderSingleProps } from "antd";
import { AiOutlineScissor } from "react-icons/ai";
import { BiSolidMagnet } from "react-icons/bi";
import { FiMinus, FiPlus } from "react-icons/fi";
import { HiSpeakerWave } from "react-icons/hi2";
import { PiSpeakerSlashFill } from "react-icons/pi";
import { clsx } from "clsx";
import {
    IoPause,
    IoPlay,
    IoPlaySkipBack,
    IoPlaySkipForward,
} from "react-icons/io5";
import { RiFullscreenFill, RiLoopRightFill } from "react-icons/ri";
import { MdOutlineDelete } from "react-icons/md";
import { GrUndo, GrRedo } from "react-icons/gr";

import {
    useCurrentFrame,
    useDeleteSelectedClips,
    useIsMuted,
    useLoopEnabled,
    usePlaybackStatus,
    useRedo,
    useSetTimelineZoomLevel,
    useSnapEnabled,
    useSplitSelectedClipAtPlayhead,
    useToggleLoop,
    useToggleMuted,
    useTogglePlay,
    useToggleSnap,
    useTimelineZoomLevel,
    useUndo,
    useZoomTimelineIn,
    useZoomTimelineOut,
    useSeekToFrame,
    useEditorVideo,
    useTogglePreviewFullscreen,
} from "../../../stores";
import { formatTime } from "../../../lib/format-time";

const stylesObject: SliderSingleProps["styles"] = {
    track: {
        backgroundColor: "black",
    },
    rail: {
        backgroundColor: "#ababab",
    },
    handle: {
        borderColor: "black",
        backgroundColor: "black",
        boxShadow: "none",
    },
};

const TimelineToolbar: React.FC = () => {
    const video = useEditorVideo();
    const status = usePlaybackStatus();
    const currentFrame = useCurrentFrame();
    const isMuted = useIsMuted();
    const snapEnabled = useSnapEnabled();
    const isLoopEnabled = useLoopEnabled();
    const zoomValue = useTimelineZoomLevel();
    const currentTime = formatTime(currentFrame, video.fps);
    // OLD logic: Duration displayed the last renderable frame, so 5s showed as 04.96 at 30fps.
    // NEW logic: Duration displays the actual end boundary.
    const durationTime = formatTime(video.durationInFrames, video.fps);

    const togglePlay = useTogglePlay();
    const seekToFrame = useSeekToFrame();
    const toggleSnap = useToggleSnap();
    const toggleLoop = useToggleLoop();
    const togglePreviewFullscreen = useTogglePreviewFullscreen();
    const toggleMuted = useToggleMuted();
    const setTimelineZoomLevel = useSetTimelineZoomLevel();
    const zoomTimelineIn = useZoomTimelineIn();
    const zoomTimelineOut = useZoomTimelineOut();
    const splitSelectedClipAtPlayhead = useSplitSelectedClipAtPlayhead();
    const deleteSelectedClips = useDeleteSelectedClips();
    const undo = useUndo();
    const redo = useRedo();

    return (
        <div className='h-fit shrink-0 w-full px-3 py-2 flex items-center justify-between border'>
            <div className='flex-1 flex items-center gap-x-1'>
                <Button
                    type='text'
                    size='middle'
                    icon={
                        <BiSolidMagnet
                            className={clsx(
                                "text-lg",
                                snapEnabled && "text-blue-600!",
                            )}
                        />
                    }
                    onClick={toggleSnap}
                />

                <Button
                    type='text'
                    size='middle'
                    icon={<AiOutlineScissor className='text-lg' />}
                    onClick={splitSelectedClipAtPlayhead}
                />

                <Button
                    type='text'
                    size='middle'
                    icon={<GrUndo className='text-lg' />}
                    onClick={undo}
                />

                <Button
                    type='text'
                    size='middle'
                    icon={<GrRedo className='text-lg' />}
                    onClick={redo}
                />

                <Button
                    type='text'
                    size='middle'
                    icon={<MdOutlineDelete className='text-lg' />}
                    onClick={deleteSelectedClips}
                />
            </div>

            <div className='flex items-center justify-center gap-x-2'>
                <span className='text-xs text-gray-500 min-w-20'>
                    {currentTime}
                </span>

                <Button
                    type='text'
                    size='middle'
                    icon={<IoPlaySkipBack className='text-2xl' />}
                    onClick={() => seekToFrame(0)}
                />

                <Button
                    type='text'
                    size='middle'
                    icon={
                        status === "playing" ? (
                            <IoPause className='text-2xl' />
                        ) : (
                            <IoPlay className='text-2xl' />
                        )
                    }
                    onClick={togglePlay}
                />

                <Button
                    type='text'
                    size='middle'
                    icon={<IoPlaySkipForward className='text-2xl' />}
                    onClick={() => seekToFrame(video.durationInFrames)}
                />

                <span className='text-xs text-gray-500 min-w-20 text-right'>
                    {durationTime}
                </span>
            </div>

            <div className='flex-1 flex items-center justify-end gap-x-1'>
                <Button
                    type='text'
                    size='middle'
                    icon={
                        <RiLoopRightFill
                            className={clsx(
                                "text-lg transition-colors",
                                isLoopEnabled && "text-blue-600!",
                            )}
                        />
                    }
                    onClick={toggleLoop}
                />

                <Button
                    type='text'
                    size='middle'
                    icon={
                        isMuted ? (
                            <PiSpeakerSlashFill className='text-lg text-blue-600!' />
                        ) : (
                            <HiSpeakerWave className='text-lg text-default' />
                        )
                    }
                    onClick={toggleMuted}
                />

                <Button
                    type='text'
                    size='middle'
                    icon={
                        <RiFullscreenFill
                            className='text-lg'
                            onClick={togglePreviewFullscreen}
                        />
                    }
                />

                <Button
                    type='text'
                    size='middle'
                    icon={<FiMinus className='text-lg' />}
                    onClick={zoomTimelineOut}
                />

                <Slider
                    className='w-22 my-0! p-2 mx-2!'
                    styles={stylesObject}
                    tooltip={{ open: false }}
                    max={10}
                    min={1}
                    value={zoomValue}
                    onChange={(newValue) => setTimelineZoomLevel(newValue)}
                />

                <Button
                    type='text'
                    size='middle'
                    icon={<FiPlus className='text-lg' />}
                    onClick={zoomTimelineIn}
                />
            </div>
        </div>
    );
};

export default TimelineToolbar;
