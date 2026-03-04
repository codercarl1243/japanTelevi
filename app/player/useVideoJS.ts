"use client";

import { useEffect, useRef, RefObject } from "react";

export function useVideoJs(
    containerRef: RefObject<HTMLDivElement | null>,
    src: string | null
) {
    const playerRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;

        async function init() {
            const videojs = (await import("video.js")).default;
            // Register chromecast plugin
            const chromecast = await import("@silvermine/videojs-chromecast");
            chromecast.default(videojs, { preloadWebComponents: true });

            if (!containerRef.current) return;

            if (playerRef.current) {
                playerRef.current.src({ src: src ?? "", type: "application/x-mpegURL" });
                return;
            }

            const videoEl = document.createElement("video");
            videoEl.className = "video-js vjs-big-play-centered";
            containerRef.current.appendChild(videoEl);

            const player = videojs(videoEl, {
                controls: true,
                autoplay: true,
                fluid: false,
                height: 500,
                liveui: true,
                enableSmoothSeeking: true,
                liveTracker: {
                    trackingThreshold: 0,
                    liveTolerance: 15,
                },
                html5: {
                    vhs: {
                        maxBufferLength: 900,   // 15 minutes behind live
                        maxMaxBufferLength: 900,
                        bufferWhilePaused: true,  // keep buffering when paused
                        allowSeeksWithinUnsafeLiveWindow: true,  // allow seeking in the buffer
                    },
                },
                controlBar: {
                    skipButtons: {
                        forward: 10,
                        back: 10
                    },
                    children: [
                        "playToggle",
                        "volumePanel",
                        "currentTimeDisplay",
                        "timeDivider",
                        "durationDisplay",
                        "progressControl",
                        "liveDisplay",
                        "seekToLive",
                        "remainingTimeDisplay",
                        "customControlSpacer",
                        "ChromeCastButton",   // ← chromecast button in control bar
                        "fullscreenToggle",
                    ],
                },
            });

            if (src) {
                player.src({ src, type: "application/x-mpegURL" });
            }

            player.on("loadedmetadata", () => {
                const seekable = player.seekable();
                console.log("seekable range:", seekable.start(0), "→", seekable.end(0));
            });
            player.on("ready", () => {
});
            playerRef.current = player;
        }

        init();
    }, [src]);

    useEffect(() => {
        return () => {
            if (playerRef.current) {
                playerRef.current.dispose();
                playerRef.current = null;
            }
        };
    }, []);

    function skip(seconds: number) {
        if (!playerRef.current) return;
        const current = playerRef.current.currentTime();
        playerRef.current.currentTime(current + seconds);
    }

    return { skip };
}