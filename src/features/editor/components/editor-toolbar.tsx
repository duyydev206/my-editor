"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "antd";
import { BiPointer } from "react-icons/bi";
import { RxText } from "react-icons/rx";
import { AiOutlinePicture } from "react-icons/ai";
import { SlCamrecorder } from "react-icons/sl";
import { FiMusic } from "react-icons/fi";
import { PiExport } from "react-icons/pi";
import { FaRegSquare } from "react-icons/fa";
import {
    useAddMediaAssetAsClip,
    useAddTextClipAtPlayhead,
    useEditorVideo,
} from "../stores";
import { createMediaAssetFromFile } from "../lib/media-assets";

const EditorToolbar: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const video = useEditorVideo();
    const addTextClipAtPlayhead = useAddTextClipAtPlayhead();
    const addMediaAssetAsClip = useAddMediaAssetAsClip();

    const openMediaPicker = () => {
        fileInputRef.current?.click();
    };

    const handleMediaFilesChange = async (
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        const files = Array.from(event.target.files ?? []);

        if (files.length === 0) return;

        setIsImporting(true);

        try {
            for (const file of files) {
                const asset = await createMediaAssetFromFile(file, video.fps);

                if (asset) {
                    addMediaAssetAsClip({ asset });
                }
            }
        } finally {
            event.target.value = "";
            setIsImporting(false);
        }
    };

    return (
        <div className='h-fit w-full bg-white p-3 border flex items-center gap-x-4'>
            <input
                ref={fileInputRef}
                type='file'
                accept='image/*,video/*,audio/*'
                multiple
                className='hidden'
                onChange={handleMediaFilesChange}
            />

            <div className='flex items-center'>
                <Button
                    size='large'
                    className='rounded-xs!'
                    icon={<BiPointer className='text-lg' />}
                />
                <Button
                    size='large'
                    className='rounded-xs!'
                    icon={<FaRegSquare className='text-lg' />}
                />
                <Button
                    size='large'
                    className='rounded-xs!'
                    icon={<RxText className='text-lg' />}
                    // OLD logic: Text button rendered only an icon.
                    // NEW logic: Create a text clip at the current playhead so Timeline and Player stay synced.
                    onClick={() => addTextClipAtPlayhead()}
                />
                <Button
                    size='large'
                    className='rounded-xs!'
                    icon={null}
                    loading={isImporting}
                    // OLD logic: Media button rendered icons only.
                    // NEW logic: Open local file picker and create media clips from imported assets.
                    onClick={openMediaPicker}>
                    <AiOutlinePicture className='text-lg' />
                    <SlCamrecorder className='text-lg' />
                    <FiMusic className='text-lg' />
                </Button>
            </div>
            <Button
                size='large'
                className='rounded-xs!'
                icon={<PiExport className='text-lg' />}
            />
        </div>
    );
};

export default EditorToolbar;
