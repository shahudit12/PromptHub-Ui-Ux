import React, { useState } from 'react';
import {
  Clapperboard,
  Clock,
  Film,
  Copy,
  Check,
  Download,
  Sparkles,
  Volume2,
  Camera,
} from 'lucide-react';
import { DeliverableVersionPills, type DeliverableVersion } from './DeliverableVersionPills';

export interface VideoScene {
  id: string;
  sceneNumber: number;
  timecode: string;
  shotType: string;
  title: string;
  visualAction: string;
  aiVisualPrompt: string;
  voiceoverScript: string;
  audioMusicCue?: string;
}

export interface VideoStoryboardData {
  title: string;
  platform: 'tiktok' | 'youtube' | 'commercial' | 'reel';
  targetDuration: string;
  aspectRatio: '9:16 Vertical' | '16:9 Widescreen' | '1:1 Square';
  targetAudience?: string;
  scenes: VideoScene[];
  version?: number;
  versions?: DeliverableVersion[];
}

export interface VideoStoryboardDeliverableCardProps {
  data?: Partial<VideoStoryboardData>;
  onIterate?: (prompt: string) => void;
  onVersionChange?: (version: number) => void;
  className?: string;
}

export const VideoStoryboardDeliverableCard: React.FC<VideoStoryboardDeliverableCardProps> = ({
  data,
  onIterate,
  onVersionChange,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [activeSceneTab, setActiveSceneTab] = useState<number>(0);

  const title = data?.title || 'Viral Video Storyboard & Script';
  const platform = data?.platform || 'tiktok';
  const targetDuration = data?.targetDuration || '45 Seconds';
  const aspectRatio = data?.aspectRatio || '9:16 Vertical';

  const scenes: VideoScene[] = data?.scenes && data.scenes.length > 0 ? data.scenes : [
    {
      id: 'sc_1',
      sceneNumber: 1,
      timecode: '0:00 - 0:03',
      shotType: 'Tight Close-up / Fast Zoom',
      title: 'The Pattern-Interrupt Hook',
      visualAction: 'Creator looks directly into camera looking frustrated holding an invoice, then points forward as a sound effect triggers.',
      aiVisualPrompt: 'Frustrated young entrepreneur looking at laptop screen in modern studio, dramatic cinematic lighting, photorealistic 8k',
      voiceoverScript: 'Stop paying ₹1,700 every single month for AI tools you barely use. Here is the secret developers won’t tell you.',
      audioMusicCue: 'Sharp vinyl stop sound effect, followed by high-tempo lo-fi beat drop.',
    },
    {
      id: 'sc_2',
      sceneNumber: 2,
      timecode: '0:03 - 0:15',
      shotType: 'Screen Recording / Over-the-shoulder',
      title: 'Exposing the Traditional Pain Point',
      visualAction: 'Fast montage showing endless subscription invoices, terminal errors, and broken code outputs.',
      aiVisualPrompt: 'Digital dashboard showing failed code build error with red glowing alerts, high-tech interface, dark mode',
      voiceoverScript: 'Most AI apps make you write 500-word prompt recipes or set up local code environments that crash after 5 minutes.',
      audioMusicCue: 'Tense rhythmic percussion building urgency.',
    },
    {
      id: 'sc_3',
      sceneNumber: 3,
      timecode: '0:15 - 0:32',
      shotType: 'Split Screen: Live Website on Phone & Laptop',
      title: 'The PromptHub Turn-1 Solution',
      visualAction: 'User types "Make a modern dental website" on PromptHub. In 10 seconds, a full working responsive website appears live with 1-click hosting.',
      aiVisualPrompt: 'Stunning modern responsive web application interface live in browser, emerald green success badges, glowing UI, 8k render',
      voiceoverScript: 'With PromptHub, you type 5 words in plain English. Boom. You get a working website synced straight to your Google Drive, for just ₹10 via UPI.',
      audioMusicCue: 'Energetic, confident synth beat kicks in at full volume.',
    },
    {
      id: 'sc_4',
      sceneNumber: 4,
      timecode: '0:32 - 0:45',
      shotType: 'High-Energy Medium Shot with On-Screen URL',
      title: 'Urgent Call to Action',
      visualAction: 'Creator smiles and holds up phone showing live hosted site on custom domain, with text arrow pointing to link in bio.',
      aiVisualPrompt: 'Smiling professional creator holding glowing modern smartphone showing clean portfolio website, bright aesthetic studio',
      voiceoverScript: 'Try it right now for free at prompthub.cloud. Link is in my bio!',
      audioMusicCue: 'Crisp audio chime, clean beat fade-out.',
    },
  ];

  const handleCopyFullScript = async () => {
    const fullText = `# ${title} (${targetDuration} • ${aspectRatio})\n\n` +
      scenes.map((s) => `### Scene ${s.sceneNumber}: ${s.title} [${s.timecode}]\n` +
        `• Shot: ${s.shotType}\n` +
        `• Visual Action: ${s.visualAction}\n` +
        `• Voiceover Script: "${s.voiceoverScript}"\n` +
        `• Audio/Music: ${s.audioMusicCue || 'None'}\n` +
        `• AI Visual Prompt: ${s.aiVisualPrompt}\n`
      ).join('\n---\n\n');

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownloadScript = () => {
    const fullText = `# Video Production Storyboard: ${title}\n` +
      `Platform: ${platform.toUpperCase()} | Duration: ${targetDuration} | Aspect Ratio: ${aspectRatio}\n\n` +
      scenes.map((s) => `========================================\n` +
        `SCENE ${s.sceneNumber}: ${s.title.toUpperCase()} (${s.timecode})\n` +
        `========================================\n` +
        `CAMERA: ${s.shotType}\n` +
        `ACTION: ${s.visualAction}\n` +
        `AUDIO/SFX: ${s.audioMusicCue || 'Standard'}\n\n` +
        `VOICEOVER DIALOGUE:\n"${s.voiceoverScript}"\n\n` +
        `AI DIFFUSION PROMPT:\n${s.aiVisualPrompt}\n`
      ).join('\n\n');

    const blob = new Blob([fullText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-storyboard.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`rounded-2xl border border-border-default bg-bg-secondary p-4 sm:p-5 shadow-xs transition-all ${className}`}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-border-default">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary tracking-tight">{title}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase">
                {platform}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5 font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-text-muted" /> {targetDuration}
              </span>
              <span>•</span>
              <span>{aspectRatio}</span>
              <span>•</span>
              <span>{scenes.length} Scenes</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data?.versions && data.versions.length > 1 && (
            <DeliverableVersionPills
              versions={data.versions}
              activeVersion={data.version || 1}
              onSelectVersion={(v) => onVersionChange?.(v)}
            />
          )}

          <button
            type="button"
            onClick={handleCopyFullScript}
            className="min-h-[32px] px-2.5 py-1 rounded-lg border border-border-default hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy full narration and shot script"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadScript}
            className="min-h-[32px] px-3 py-1 rounded-lg bg-brand-primary hover:bg-[#084C8D] dark:bg-[#41A2D9] dark:hover:bg-[#64B6E3] text-white dark:text-[#000000] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download formatted storyboard and script file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Script (.md)</span>
          </button>
        </div>
      </div>

      {/* Scene Navigation Pills */}
      <div className="my-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {scenes.map((scene, idx) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => setActiveSceneTab(idx)}
            className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
              activeSceneTab === idx
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-bg-primary hover:bg-bg-tertiary border border-border-default text-text-secondary'
            }`}
          >
            <Clapperboard className="w-3 h-3" />
            <span>Scene {scene.sceneNumber}: {scene.timecode}</span>
          </button>
        ))}
      </div>

      {/* Active Scene Detailed Card */}
      {scenes[activeSceneTab] && (() => {
        const sc = scenes[activeSceneTab];
        return (
          <div className="p-4 sm:p-5 rounded-2xl bg-bg-primary border border-border-default shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  {sc.timecode}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
                  {sc.title}
                </h4>
              </div>
              <span className="text-xs font-mono text-text-muted flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" /> {sc.shotType}
              </span>
            </div>

            {/* Voiceover Script Block */}
            <div className="p-3.5 rounded-xl bg-purple-950/15 border border-purple-800/30">
              <div className="flex items-center justify-between text-[11px] font-mono text-purple-600 dark:text-purple-300 font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" /> Narration Voiceover Script
                </span>
                <span className="text-[10px] uppercase">Speak Confidently</span>
              </div>
              <p className="text-xs sm:text-sm text-text-primary leading-relaxed font-medium italic">
                "{sc.voiceoverScript}"
              </p>
            </div>

            {/* Visual Action & AI Prompt Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-bg-secondary border border-border-default space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-text-muted">
                  Visual Stage Action
                </span>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {sc.visualAction}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-bg-secondary border border-border-default space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-text-muted">
                  AI Image / Video Diffusion Prompt
                </span>
                <p className="text-[11px] font-mono text-brand-primary dark:text-[#41A2D9] leading-relaxed break-words">
                  {sc.aiVisualPrompt}
                </p>
              </div>
            </div>

            {/* Music & Sound Design Cue */}
            {sc.audioMusicCue && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-tertiary text-xs text-text-secondary">
                <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span><strong className="text-text-primary">Audio SFX:</strong> {sc.audioMusicCue}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Revision Prompts */}
      <div className="mt-3.5 pt-3 border-t border-border-default flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-mono text-text-muted uppercase font-bold mr-1">
          Revise Storyboard:
        </span>
        {[
          'Make hook more urgent',
          'Shorten total duration to 30s',
          'Add high-energy humor',
          'Switch to 16:9 YouTube format',
        ].map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onIterate?.(chip)}
            className="min-h-[28px] px-2.5 py-0.5 rounded-lg border border-border-default hover:border-purple-500 bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-[11px] transition-colors cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
};
