/**
 * src/services/media/muxService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client service for Mux Video Walkthroughs, Demos & Streaming Playback.
 *
 * Interacts with PromptHub serverless gateway `/api/mux`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { featureFlags } from '../../config/featureFlags';
import { trackVideoDemoViewed, trackVideoPlaybackStarted } from '../../lib/mixpanelEvents';

export interface MuxAsset {
  assetId: string;
  playbackId: string | null;
  streamUrl: string | null;
  thumbnailUrl: string | null;
  status: string;
  duration?: number;
  aspectRatio?: string;
  createdAt?: string;
}

export const muxService = {
  async getStatus(): Promise<{ configured: boolean }> {
    if (!featureFlags.isMuxEnabled()) {
      return { configured: false };
    }
    try {
      const res = await fetch('/api/mux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' }),
      });
      if (!res.ok) return { configured: false };
      const data = await res.json();
      return { configured: Boolean(data.configured) };
    } catch {
      return { configured: false };
    }
  },

  async listAssets(limit = 10): Promise<MuxAsset[]> {
    if (!featureFlags.isMuxEnabled()) return [];
    try {
      const res = await fetch('/api/mux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_assets', limit }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.assets || [];
    } catch {
      return [];
    }
  },

  async createDirectUpload(): Promise<{ uploadId: string; uploadUrl: string } | null> {
    const res = await fetch('/api/mux', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_upload' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create Mux direct upload.');
    }

    const data = await res.json();
    return { uploadId: data.uploadId, uploadUrl: data.uploadUrl };
  },

  async checkUploadStatus(uploadId: string): Promise<{ status: string; assetId?: string }> {
    const res = await fetch('/api/mux', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_upload', uploadId }),
    });

    if (!res.ok) {
      throw new Error('Failed to retrieve upload status.');
    }

    const data = await res.json();
    return { status: data.status, assetId: data.assetId };
  },

  async getAssetPlayback(assetId: string): Promise<MuxAsset> {
    const res = await fetch('/api/mux', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_asset', assetId }),
    });

    if (!res.ok) {
      throw new Error('Failed to retrieve asset playback.');
    }

    const data = await res.json();
    return {
      assetId: data.assetId,
      playbackId: data.playbackId,
      streamUrl: data.streamUrl,
      thumbnailUrl: data.thumbnailUrl,
      status: data.status,
      duration: data.duration,
      aspectRatio: data.aspectRatio,
    };
  },

  trackView(playbackId: string, promptId?: string, videoTitle?: string): void {
    trackVideoDemoViewed({
      playbackId,
      promptId,
      videoTitle,
    });
  },

  trackPlay(playbackId: string, promptId?: string, durationSec?: number): void {
    trackVideoPlaybackStarted({
      playbackId,
      promptId,
      durationSec,
    });
  },
};
