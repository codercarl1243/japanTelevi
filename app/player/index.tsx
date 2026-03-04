"use client";

import { useRef, useState } from "react";
import { StreamItem, Programme } from "../types";
import VideoPlayer from "./videoPlayer";
import { useVideoJs } from "./useVideoJS";

export default function Main({ streams, programmes }: { streams: StreamItem[]; programmes: Programme[] }) {

    const [current, setCurrent] = useState<StreamItem | null>(null);

    const videoRef = useRef<HTMLDivElement>(null);

    const { skip } = useVideoJs(videoRef, current?.url ?? null);

    return (
        <VideoPlayer
            streams={streams}
            programmes={programmes}
            current={current}
            setCurrent={setCurrent}
            videoRef={videoRef}
            skip={skip}
        />
    );
}