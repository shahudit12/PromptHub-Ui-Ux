/**
 * src/components/media/VideoPlayer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsive Mux HLS Streaming Video Player for Prompt Walkthroughs & Demos.
 *
 * Implements:
 * - HLS stream playback (https://stream.mux.com/${playbackId}.m3u8)
 * - Mux WebP thumbnail poster (https://image.mux.com/${playbackId}/thumbnail.webp)
 * - Playback telemetry via Mixpanel (trackPlay / trackView)
 * - Accessible controls & touch targets >= 44px
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react';
import { muxService } from '../../services/media/muxService';

interface VideoPlayerProps {
  playbackId: string;
  title?: string;
  promptId?: string;
  posterUrl?: string;
  autoPlay?: boolean;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  playbackId,
  title,
  promptId,
  posterUrl,
  autoPlay = false,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  const isDirectUrl = playbackId.startsWith('http://') || playbackId.startsWith('https://') || playbackId.startsWith('/api/') || playbackId.startsWith('data:');
  const streamUrl = isDirectUrl ? playbackId : `https://stream.mux.com/${playbackId}.m3u8`;
  const defaultPoster = posterUrl || (isDirectUrl ? undefined : `https://image.mux.com/${playbackId}/thumbnail.webp?time=1`);

  useEffect(() => {
    muxService.trackView(playbackId, promptId, title);
  }, [playbackId, promptId, title]);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        if (!hasStartedPlaying) {
          setHasStartedPlaying(true);
          muxService.trackPlay(playbackId, promptId, videoRef.current?.duration);
        }
      }).catch((err) => {
        console.warn('[Video Playback error]:', err);
      });
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      videoRef.current.requestFullscreen?.();
    }
  };

  return (
    <div
      className={`relative group overflow-hidden rounded-2xl bg-neutral-900 border border-border-default shadow-lg aspect-video ${className}`}
    >
      <video
        ref={videoRef}
        src={streamUrl}
        poster={defaultPoster}
        autoPlay={autoPlay}
        playsInline
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {/* Center Play Button Overlay when Paused */}
      {!isPlaying && !isLoading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-neutral-900/80 hover:bg-brand-primary text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-xl hover:scale-105 min-h-[44px] min-w-[44px]"
          aria-label="Play video"
        >
          <Play className="w-6 h-6 ml-0.5 fill-current" />
        </button>
      )}

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="p-2 text-white hover:text-[#BDDDFC] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          <button
            onClick={toggleMute}
            className="p-2 text-white hover:text-[#BDDDFC] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          {title && (
            <span className="text-xs text-white/90 font-medium truncate max-w-[200px] ml-1">
              {title}
            </span>
          )}
        </div>

        <button
          onClick={toggleFullscreen}
          className="p-2 text-white hover:text-[#BDDDFC] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Full screen"
        >
          <Maximize className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
export default VideoPlayer;
