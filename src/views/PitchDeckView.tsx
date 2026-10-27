import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Volume2, VolumeX, Check, Sparkles, Terminal, Gauge, Layers
} from 'lucide-react';

const EASE_KINETIC = [0.16, 1, 0.3, 1] as const;

interface SceneConfig {
  id: number;
  title: string;
  category: string;
  camX: number;
  camY: number;
  camZ: number;
  rotY: number;
  promptPos: { x: number; y: number; z: number; scale: number };
  promptBadge: string;
  promptText: string;
  promptEngine: string;
  promptStats: string;
  speakerNotes: string;
}

const SCENES: SceneConfig[] = [
  {
    id: 1,
    title: "HERO IGNITION",
    category: "INTRO · PRODUCT VISION",
    camX: 0, camY: 0, camZ: 0, rotY: 0,
    promptPos: { x: 0, y: 140, z: 200, scale: 0.95 },
    promptBadge: "● Studio Raw Draft",
    promptText: "Write a marketing post about our new AI tool",
    promptEngine: "Engine: Pending Selection",
    promptStats: "11 tokens · 0 cr",
    speakerNotes: "Good morning, esteemed judges of BuzzTech 2.0 and SVIT Vasad. Today we present PromptHub—the AI Prompt Engineering & Model Studio. Over the last two years, LLMs have grown immensely capable, yet building with them remains messy, unscientific, and completely fragmented. PromptHub turns natural language prompting into a structured, testable, and reusable engineering discipline. Built right here at SVIT."
  },
  {
    id: 2,
    title: "8-TOOL FRAGMENTATION",
    category: "PROBLEM CONTEXT",
    camX: 1800, camY: 0, camZ: -100, rotY: -10,
    promptPos: { x: 1800, y: 0, z: 120, scale: 0.8 },
    promptBadge: "⚠ Fragmented Clipboard",
    promptText: "Write a marketing post about our new AI tool...",
    promptEngine: "Multiple Disjoint Tabs",
    promptStats: "Context Lost Across 8 Apps",
    speakerNotes: "Let us examine the reality of AI engineering today. A developer drafts a prompt in Notepad, tests it in ChatGPT, opens another tab for Claude, copies output to a spreadsheet, checks Slack, and manually burns tokens without cost predictability. This 8-tool fragmentation causes fragile prompts, leaked secrets, and wasted engineering hours. AI became powerful—the workflow stayed fragmented."
  },
  {
    id: 3,
    title: "THE CORE INSIGHT",
    category: "CORE PREMISE",
    camX: 3600, camY: 0, camZ: 0, rotY: 0,
    promptPos: { x: 3600, y: -40, z: 220, scale: 1.05 },
    promptBadge: "⚡ Parameterized Schema",
    promptText: "Write a {{content_type}} about {{product}} targeting {{audience}} with {{tone}} tone. Output format: JSON schema.",
    promptEngine: "Dynamic Variable Extraction",
    promptStats: "4 Variables · Schema Defined",
    speakerNotes: "Our foundational insight: Generating casual text with an AI is trivial. Engineering deterministic outputs in production is hard. Prompts in software aren't disposable text strings—they are engineering configuration artifacts. They require dynamic parameter injection, hard negative constraints, and structured schema verification."
  },
  {
    id: 4,
    title: "4 PILLARS ARCHITECTURE",
    category: "PRODUCT ARCHITECTURE",
    camX: 5400, camY: 0, camZ: -150, rotY: 8,
    promptPos: { x: 5400, y: 180, z: 150, scale: 0.85 },
    promptBadge: "★ PromptHub Studio",
    promptText: "Write a {{content_type}} about {{product}} targeting {{audience}}.",
    promptEngine: "Full Studio Integration",
    promptStats: "Centralized Workspace",
    speakerNotes: "PromptHub converges the entire stack into four pillars: First, an authoring IDE with automatic variable extraction. Second, a 7-dimension static analyzer that catches defects before token execution. Third, a parallel multi-model Arena. And fourth, a creator marketplace to share, store, and monetize prompt templates."
  },
  {
    id: 5,
    title: "HERO PIPELINE WORKFLOW",
    category: "LIFECYCLE STORY",
    camX: 7200, camY: 0, camZ: 0, rotY: 0,
    promptPos: { x: 7200, y: -90, z: 200, scale: 1.0 },
    promptBadge: "● Traveling Asset",
    promptText: "Write a {{content_type}} about {{product}} targeting {{audience}} with strict JSON schema.",
    promptEngine: "Station: Routing To Arena",
    promptStats: "Pipeline Stage: 5 / 8",
    speakerNotes: "Watch our hero animation: One prompt travels through authoring, variable parameterization, diagnostic evaluation, algorithmic optimization, model routing, multi-model benchmarking, encrypted vault storage, and marketplace publication. Every step is measurable, reproducible, and verifiable."
  },
  {
    id: 6,
    title: "STATIC ANALYZER & OPTIMIZER",
    category: "DEEP DIVE · DIAGNOSTICS",
    camX: 9000, camY: 0, camZ: 0, rotY: 0,
    promptPos: { x: 9230, y: 20, z: 180, scale: 0.95 },
    promptBadge: "✓ Algorithmic Optimization",
    promptText: "Role: Senior Product Marketer\nTask: Launch announcement for {{product}}\nAudience: {{audience}}\nConstraints: Max 280 chars, JSON format\nSuccess Criteria: Closes value gap under 10s.",
    promptEngine: "Score Surged: 3.6 → 8.7 / 10",
    promptStats: "Optimization Gain: +142%",
    speakerNotes: "Here is the Analyzer in action. Instead of spending tokens blindly, our heuristic engine evaluates clarity, specificity, context, constraints, and output definitions. Weak prompts get diagnosed immediately, and our one-click Optimizer restructures raw requests into bulletproof production specifications."
  },
  {
    id: 7,
    title: "MULTI-MODEL ARENA",
    category: "BENCHMARKING",
    camX: 10800, camY: 0, camZ: -100, rotY: 0,
    promptPos: { x: 10800, y: -180, z: 180, scale: 0.8 },
    promptBadge: "⚡ Arena Benchmark Request",
    promptText: "Role: Product Marketer · Announce {{product}} to {{audience}} in JSON format.",
    promptEngine: "Active Execution across 4 Models",
    promptStats: "Claude 3.5 Sonnet: WINNER",
    speakerNotes: "In the Multi-Model Arena, we eliminate guesswork: 'Don't guess which model is best. Benchmark it.' The same prompt fires simultaneously into Claude 3.5 Sonnet, GPT-4o, DeepSeek, and open-weight models. We telemetry quality, latency, token consumption, and INR cost side-by-side."
  },
  {
    id: 8,
    title: "DUAL-LAYER INFRASTRUCTURE",
    category: "SUSTAINABILITY",
    camX: 12600, camY: 0, camZ: 0, rotY: 0,
    promptPos: { x: 12600, y: 160, z: 150, scale: 0.8 },
    promptBadge: "🔒 Dynamic Routing",
    promptText: "Request Packet #pr-7092 dispatched through intelligent gateway.",
    promptEngine: "Route: AICredits Paid Gateway",
    promptStats: "AES-GCM Encrypted Vault",
    speakerNotes: "Our infrastructure model avoids expensive hardware overhead. For free access, we leverage OpenRouter's open-weight catalog. For production paid inference, AICredits provides unified INR settlement without dollar cards. For enterprise developers, client-side AES-GCM BYOK guarantees zero server key retention."
  },
  {
    id: 9,
    title: "CREATOR ECONOMY",
    category: "MARKETPLACE",
    camX: 14400, camY: 0, camZ: 0, rotY: 0,
    promptPos: { x: 14620, y: 140, z: 160, scale: 0.8 },
    promptBadge: "💎 Verified Digital Asset",
    promptText: "Prompt #pr-7092 listed at ₹149. 70% direct creator revenue settlement.",
    promptEngine: "Marketplace Liquid Asset",
    promptStats: "Creator Take: 70% · Platform: 30%",
    speakerNotes: "The Marketplace transforms prompting into reusable intellectual property. Creators who craft deterministic templates monetize their work, earning 70% of every sale while PromptHub retains a 30% take rate. Official curated prompts are bundled directly into our subscription tiers."
  },
  {
    id: 10,
    title: "NOT JUST AN AI WRAPPER",
    category: "DEFENSIBILITY",
    camX: 16200, camY: 0, camZ: 0, rotY: 0,
    promptPos: { x: 16200, y: 120, z: 160, scale: 0.75 },
    promptBadge: "🛡 Workflow Moat",
    promptText: "Engineering Studio · 7-D Analyzer · Model Arena · Telemetry · Vault · Teams",
    promptEngine: "Proprietary Orchestration Layer",
    promptStats: "Model-Agnostic Tooling",
    speakerNotes: "Why can't OpenAI or Anthropic kill PromptHub? A generic wrapper that simply resells ChatGPT chat boxes is easily replaced. But OpenAI will never build an Arena showing Claude beating GPT-4o at half the cost. Foundation models are commodities. The developer workflow, evaluation history, and team vaults are the product."
  },
  {
    id: 11,
    title: "DISCIPLINED ROADMAP",
    category: "GROWTH",
    camX: 18000, camY: 0, camZ: 0, rotY: 0,
    promptPos: { x: 18000, y: 160, z: 140, scale: 0.75 },
    promptBadge: "📈 Phased Execution",
    promptText: "Phase 1 Live → Phase 2 Teams/Git → Phase 3 Enterprise Governance",
    promptEngine: "Ecosystem Expansion",
    promptStats: "From Individual to Enterprise",
    speakerNotes: "Our roadmap is grounded in execution. Phase 1 is fully built and operating live today on PromptHub.cloud. Phase 2 unlocks Git-style prompt branching, regression suites, and team workspaces. Phase 3 introduces autonomous prompt-to-agent compilation and enterprise RBAC compliance."
  },
  {
    id: 12,
    title: "SVIT VASAD & BUZZTECH",
    category: "ORIGIN STORY",
    camX: 19800, camY: 0, camZ: 0, rotY: 0,
    promptPos: { x: 19800, y: 140, z: 140, scale: 0.75 },
    promptBadge: "🏛 Incubated at SVIT",
    promptText: "SVIT Vasad · SSIP Incubation · BuzzTech 2.0 50-Day Venture Accelerator",
    promptEngine: "Lab Discovery to Production",
    promptStats: "Student Innovation in Action",
    speakerNotes: "PromptHub was conceived and built right here at SVIT Vasad. Through BuzzTech 2.0 and the SSIP ecosystem, we evolved from students building a demo into founders deploying production systems with live database security, real payment gateways, and scalable multi-model routing."
  },
  {
    id: 13,
    title: "THE FUTURE OF PROMPT ENGINEERING",
    category: "CLOSING ETHOS",
    camX: 21600, camY: 0, camZ: 0, rotY: 0,
    promptPos: { x: 21600, y: 180, z: 140, scale: 0.7 },
    promptBadge: "● PROMPTHUB.CLOUD",
    promptText: "Build. Test. Improve. Reuse.",
    promptEngine: "AI Prompt Engineering Studio",
    promptStats: "Deployed Live",
    speakerNotes: "To conclude: PromptHub does not seek to be another chatbot. We are building the engineering studio around artificial intelligence—where developers design, benchmark, and deploy reliable prompt systems. Thank you to the mentors of SVIT and BuzzTech 2.0. We welcome your questions."
  }
];

export const PitchDeckView: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const { setActiveTab, isLoggedIn } = useApp();

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playHaptic = useCallback((type: 'tick' | 'swoosh' | 'win') => {
    if (!isSoundOn) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'tick') {
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'swoosh') {
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'win') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {}
  }, [isSoundOn]);

  const navigateTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= SCENES.length) return;
    setCurrentIdx(idx);
    playHaptic('swoosh');
  }, [playHaptic]);

  const nextScene = useCallback(() => navigateTo(currentIdx + 1), [currentIdx, navigateTo]);
  const prevScene = useCallback(() => navigateTo(currentIdx - 1), [currentIdx, navigateTo]);

  const toggleNotes = useCallback(() => setIsNotesOpen(prev => !prev), []);
  const toggleSound = useCallback(() => {
    setIsSoundOn(prev => !prev);
    playHaptic('tick');
  }, [playHaptic]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextScene();
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'PageUp') {
        e.preventDefault();
        prevScene();
      } else if (e.key.toLowerCase() === 'n') {
        toggleNotes();
      } else if (e.key.toLowerCase() === 'm') {
        toggleSound();
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        setIsNotesOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextScene, prevScene, toggleNotes, toggleSound, toggleFullscreen]);

  const currentScene = SCENES[currentIdx];
  const p = currentScene.promptPos;

  return (
    <div className="relative w-full h-full bg-[#0E110F] text-[#F0F2F5] overflow-hidden select-none font-sans">
      
      {/* ─── 3D VIEWPORT ─────────────────────────────────────────────────── */}
      <div 
        className="w-full h-full relative overflow-hidden"
        style={{
          perspective: 1200,
          background: 'radial-gradient(circle at 50% 40%, #0B1118 0%, #000000 75%)'
        }}
      >
        <motion.div
          className="w-full h-full absolute"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{
            x: -currentScene.camX,
            y: -currentScene.camY,
            z: -currentScene.camZ,
            rotateY: currentScene.rotY
          }}
          transition={{ duration: 1.2, ease: EASE_KINETIC }}
        >
          {/* Spatial Grid Ground */}
          <div 
            className="absolute pointer-events-none opacity-30"
            style={{
              width: 4000,
              height: 4000,
              left: -1500,
              top: '50%',
              backgroundImage: 'linear-gradient(#1C2B3A 1px, transparent 1px), linear-gradient(90deg, #1C2B3A 1px, transparent 1px)',
              backgroundSize: '80px 80px',
              transform: 'rotateX(80deg) translateZ(-400px)'
            }}
          />

          {/* ─── THE PHYSICAL TRAVELING PROMPT CAPSULE ───────────────────── */}
          <motion.div
            className="absolute rounded-xl border p-5 backdrop-blur-xl z-50 pointer-events-auto"
            style={{
              width: 640,
              left: '50%',
              top: '50%',
              marginLeft: -320,
              marginTop: -140,
              backgroundColor: 'rgba(17, 18, 20, 0.88)',
              borderColor: 'rgba(64, 180, 130, 0.4)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(64,180,130,0.15)',
              transformStyle: 'preserve-3d'
            }}
            animate={{
              x: p.x,
              y: p.y,
              z: p.z,
              scale: p.scale
            }}
            transition={{ duration: 1.1, ease: EASE_KINETIC }}
          >
            <div className="flex justify-between items-center pb-2 mb-3 border-b border-[#202227]">
              <span className="text-xs font-mono uppercase tracking-wider text-[#41A2D9] bg-[#41A2D9]/10 border border-[#41A2D9]/30 px-2 py-0.5 rounded">
                {currentScene.promptBadge}
              </span>
              <span className="text-xs text-[#52555F] font-mono">ID: #pr-7092</span>
            </div>
            
            <div className="font-mono text-sm leading-relaxed text-[#F0F2F5] min-h-[100px] whitespace-pre-wrap">
              {currentScene.id === 3 ? (
                <div>
                  Write a <span className="bg-[#41A2D9]/20 text-sky-200 border border-[#41A2D9]/40 px-1.5 py-0.5 rounded mx-1 font-semibold">{`{{content_type}}`}</span> 
                  about <span className="bg-[#41A2D9]/20 text-sky-200 border border-[#41A2D9]/40 px-1.5 py-0.5 rounded mx-1 font-semibold">{`{{product}}`}</span> 
                  targeting <span className="bg-[#41A2D9]/20 text-sky-200 border border-[#41A2D9]/40 px-1.5 py-0.5 rounded mx-1 font-semibold">{`{{audience}}`}</span>.
                  <br className="mb-2"/>
                  Constraints: Max 280 chars · Output: strict JSON.
                </div>
              ) : currentScene.promptText}
            </div>

            <div className="flex justify-between items-center pt-2 mt-3 border-t border-[#202227] text-xs font-mono text-[#8E929B]">
              <span>{currentScene.promptEngine}</span>
              <span>{currentScene.promptStats}</span>
            </div>
          </motion.div>

          {/* ─── SCENE 01: HERO ─────────────────────────────────────────── */}
          <div 
            className={`absolute flex flex-col items-center justify-center pointer-events-none transition-opacity duration-700 ${currentIdx === 0 ? 'opacity-100' : 'opacity-0'}`}
            style={{ width: 1100, height: 640, left: '50%', top: '50%', marginLeft: -550, marginTop: -320, transform: 'translate3d(0, 0, 0)' }}
          >
            <div className="text-center max-w-4xl">
              <div className="font-mono text-xs text-[#8E929B] tracking-widest uppercase mb-3">BUZZTECH 2.0 EVALUATION · SVIT VASAD</div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
                Prompting is easy.<br/>
                Engineering AI reliably <span className="text-[#41A2D9]">isn't.</span>
              </h1>
              <p className="text-lg text-[#8E929B] max-w-2xl mx-auto mb-10 leading-relaxed">
                PromptHub brings the chaotic generative AI workflow into one unified, measurable, and testable developer studio.
              </p>
              <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="bg-[#111214] border border-[#2A2B30] p-4 rounded-xl text-left">
                  <div className="text-[#41A2D9] font-bold mb-1 flex items-center gap-2"><Terminal className="w-4 h-4"/> Studio IDE</div>
                  <p className="text-xs text-[#8E929B]">Parameterize templates with dynamic variables.</p>
                </div>
                <div className="bg-[#111214] border border-[#2A2B30] p-4 rounded-xl text-left">
                  <div className="text-sky-400 font-bold mb-1 flex items-center gap-2"><Gauge className="w-4 h-4"/> 7-D Analyzer</div>
                  <p className="text-xs text-[#8E929B]">Algorithmic linting and ambiguity diagnostics.</p>
                </div>
                <div className="bg-[#111214] border border-[#2A2B30] p-4 rounded-xl text-left">
                  <div className="text-amber-400 font-bold mb-1 flex items-center gap-2"><Layers className="w-4 h-4"/> Model Arena</div>
                  <p className="text-xs text-[#8E929B]">Benchmarking across frontier &amp; open models.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── SCENE 06: STATIC ANALYZER & OPTIMIZER ──────────────────── */}
          <div 
            className={`absolute flex flex-col items-center justify-center transition-opacity duration-700 ${currentIdx === 5 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            style={{ width: 1100, height: 640, left: '50%', top: '50%', marginLeft: -550, marginTop: -320, transform: 'translate3d(9000px, 0, 0)' }}
          >
            <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
              <div className="bg-[#111214] border border-[#2A2B30] rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-xs font-bold text-[#41A2D9]">7-DIMENSION STATIC SCAN</span>
                  <span className="font-mono text-base font-bold text-[#41A2D9]">{isOptimized ? '8.7 / 10' : '3.6 / 10'}</span>
                </div>
                {[
                  { label: "Clarity", val: isOptimized ? 92 : 40 },
                  { label: "Specificity", val: isOptimized ? 88 : 35 },
                  { label: "Context Depth", val: isOptimized ? 85 : 30 },
                  { label: "Boundary Constraints", val: isOptimized ? 98 : 20 },
                  { label: "Output Schema", val: isOptimized ? 96 : 45 },
                  { label: "Few-Shot Examples", val: isOptimized ? 75 : 15 },
                ].map((item, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex justify-between text-xs font-mono text-[#8E929B] mb-1">
                      <span>{item.label}</span>
                      <span>{item.val}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#16181C] rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-[#41A2D9] rounded-full"
                        animate={{ width: `${item.val}%` }}
                        transition={{ duration: 0.6, ease: EASE_KINETIC }}
                      />
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => { setIsOptimized(true); playHaptic('win'); }}
                  className="w-full mt-4 py-2 px-4 rounded-lg bg-[#41A2D9]/10 hover:bg-[#41A2D9]/20 border border-[#41A2D9]/40 text-[#41A2D9] font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4"/> {isOptimized ? "Optimized at +142% Quality" : "Trigger Algorithmic Optimizer"}
                </button>
              </div>

              <div className="flex flex-col justify-center">
                <h2 className="text-3xl font-bold mb-3">Don't Guess.<br/>Lint Before Execution.</h2>
                <p className="text-sm text-[#8E929B] leading-relaxed mb-4">
                  The static analyzer catches ambiguity and missing schemas before burning inference tokens. One click restructures the prompt into a robust production template.
                </p>
                <div className="font-mono text-xs text-[#41A2D9] flex items-center gap-2">
                  <Check className="w-4 h-4"/> Deterministic Output Guardrails
                </div>
              </div>
            </div>
          </div>

          {/* ─── SCENE 07: MULTI-MODEL ARENA ────────────────────────────── */}
          <div 
            className={`absolute flex flex-col items-center justify-center transition-opacity duration-700 ${currentIdx === 6 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            style={{ width: 1100, height: 640, left: '50%', top: '50%', marginLeft: -550, marginTop: -320, transform: 'translate3d(10800px, 0, 0)' }}
          >
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-1">Multi-Model Arena: Live Benchmark</h2>
              <p className="text-sm text-[#8E929B]">Simultaneous parallel execution across frontier and open-weight architectures.</p>
            </div>
            <div className="grid grid-cols-4 gap-4 w-full max-w-5xl">
              {[
                { name: "Claude 3.5 Sonnet", badge: "BEST FIT ★", status: "200 OK · High Coherence", ms: "1,180ms", score: "98%", inr: "₹0.48", border: "border-[#41A2D9] shadow-lg shadow-[#41A2D9]/20" },
                { name: "GPT-4o", badge: "Frontier", status: "200 OK · Detailed Output", ms: "1,420ms", score: "94%", inr: "₹0.62", border: "border-[#2A2B30]" },
                { name: "DeepSeek V3", badge: "High Value", status: "200 OK · Fast Execution", ms: "840ms", score: "92%", inr: "₹0.08", border: "border-[#2A2B30]" },
                { name: "Llama 3 70B", badge: "Open Free", status: "200 OK · Zero Token Cost", ms: "620ms", score: "88%", inr: "₹0.00", border: "border-[#2A2B30]" }
              ].map((m, i) => (
                <div key={i} className={`bg-[#111214] border ${m.border} rounded-xl p-4 flex flex-col justify-between h-72`}>
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-sm">{m.name}</span>
                      <span className="text-[10px] font-mono text-[#41A2D9]">{m.badge}</span>
                    </div>
                    <div className="bg-[#16181C] p-3 rounded font-mono text-xs text-[#8E929B] leading-relaxed mb-3">
                      {m.status}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#52555F] border-t border-[#202227] pt-2">
                    <div>Latency: <span className="text-[#F0F2F5]">{m.ms}</span></div>
                    <div>Score: <span className="text-[#41A2D9]">{m.score}</span></div>
                    <div>Cost: <span className="text-[#F0F2F5]">{m.inr}</span></div>
                    <div>Tokens: <span className="text-[#F0F2F5]">~400</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── SCENE 10: NOT JUST AN AI WRAPPER ───────────────────────── */}
          <div 
            className={`absolute flex flex-col items-center justify-center transition-opacity duration-700 ${currentIdx === 9 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            style={{ width: 1100, height: 640, left: '50%', top: '50%', marginLeft: -550, marginTop: -320, transform: 'translate3d(16200px, 0, 0)' }}
          >
            <div className="text-center max-w-3xl">
              <div className="grid grid-cols-3 gap-4 mb-8">
                {["Static 7-D Analyzer", "Multi-Model Arena", "Telemetry & Cost Tracking", "Creator Marketplace", "BYOK AES-GCM Vault", "Team Workspaces"].map((item, i) => (
                  <div key={i} className="bg-[#111214] border border-[#41A2D9]/40 p-3 rounded-lg text-[#41A2D9] font-semibold text-xs shadow-md shadow-[#41A2D9]/10">
                    {item}
                  </div>
                ))}
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-2 text-[#F0F2F5]">
                THE MODELS ARE THE INFRASTRUCTURE.
              </h2>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#41A2D9]">
                THE WORKFLOW IS THE PRODUCT.
              </h2>
            </div>
          </div>

          {/* ─── SCENE 13: CLOSING ETHOS ─────────────────────────────────── */}
          <div 
            className={`absolute flex flex-col items-center justify-center transition-opacity duration-700 ${currentIdx === 12 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            style={{ width: 1100, height: 640, left: '50%', top: '50%', marginLeft: -550, marginTop: -320, transform: 'translate3d(21600px, 0, 0)' }}
          >
            <div className="text-center max-w-3xl">
              <p className="text-2xl md:text-3xl font-light text-[#8E929B] mb-4">
                "Prompt engineering is becoming an engineering discipline.<br/>
                <span className="text-[#41A2D9] font-semibold">PromptHub is building the workspace for it."</span>
              </p>
              <div className="text-5xl md:text-7xl font-extrabold text-[#F0F2F5] tracking-tight mb-4">
                PROMPTHUB.CLOUD
              </div>
              <p className="font-mono text-xs text-[#52555F] uppercase tracking-widest mb-6">
                Built at SVIT Vasad · Supported by the BuzzTech 2.0 Ecosystem
              </p>
              <div className="flex justify-center gap-4 text-sm font-mono text-[#F0F2F5]">
                <span>BUILD.</span> · <span>TEST.</span> · <span>IMPROVE.</span> · <span className="text-[#41A2D9]">REUSE.</span>
              </div>
            </div>
          </div>

        </motion.div>
      </div>

      {/* ─── HUD TOP OVERLAY ──────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
        <button 
          type="button"
          className="flex items-center gap-2 pointer-events-auto cursor-pointer opacity-70 hover:opacity-100 transition-opacity bg-transparent border-none text-left p-0 min-h-[44px]"
          onClick={() => setActiveTab(isLoggedIn ? 'workspace' : 'home')}
          title="Exit Presentation"
          aria-label="Exit Presentation"
        >
          <ChevronLeft className="w-5 h-5 text-[#41A2D9]"/>
          <span className="text-sm font-medium text-white">Exit Presentation</span>
        </button>

        <div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={toggleSound}
            className={`p-2 bg-[#111214] border border-[#2A2B30] rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors ${isSoundOn ? 'text-[#41A2D9] border-[#41A2D9]/50' : 'text-[#8E929B]'}`}
          >
            {isSoundOn ? <Volume2 className="w-4 h-4"/> : <VolumeX className="w-4 h-4"/>}
            <span>Sound [M]</span>
          </button>
          
          <button 
            onClick={toggleFullscreen}
            className="p-2 bg-[#111214] border border-[#2A2B30] rounded-lg text-[#8E929B] hover:text-[#F0F2F5] transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4"/> : <Maximize2 className="w-4 h-4"/>}
          </button>

          <button 
            onClick={toggleNotes}
            className={`px-3 py-1.5 bg-[#111214] border border-[#2A2B30] rounded-lg text-xs font-mono transition-colors ${isNotesOpen ? 'text-[#41A2D9] border-[#41A2D9]/50' : 'text-[#8E929B]'}`}
          >
            Notes [N]
          </button>
        </div>
      </div>

      {/* ─── HUD BOTTOM PROGRESS & TIMELINE ───────────────────────────────── */}
      <div className="absolute bottom-6 left-0 w-full px-8 flex justify-between items-center z-50 pointer-events-none">
        <div className="text-xs font-mono text-[#41A2D9] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#41A2D9] animate-pulse"/>
          <span>SCENE {String(currentIdx + 1).padStart(2, '0')} / 13 · {currentScene.title}</span>
        </div>

        {/* Timeline Indicator Bars */}
        <div className="flex items-center gap-2 bg-[#111214]/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#2A2B30] pointer-events-auto">
          {SCENES.map((_, i) => (
            <button
              key={i}
              onClick={() => navigateTo(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${i === currentIdx ? 'w-8 bg-[#41A2D9]' : 'w-4 bg-[#2A2B30] hover:bg-[#52555F]'}`}
              title={`Scene ${i+1}`}
            />
          ))}
        </div>

        {/* Next / Prev Stepper */}
        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={prevScene} 
            disabled={currentIdx === 0}
            className="p-2 bg-[#111214] border border-[#2A2B30] rounded-lg disabled:opacity-30 hover:border-[#41A2D9]/50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4"/>
          </button>
          <button 
            onClick={nextScene} 
            disabled={currentIdx === SCENES.length - 1}
            className="p-2 bg-[#111214] border border-[#2A2B30] rounded-lg disabled:opacity-30 hover:border-[#41A2D9]/50 transition-colors"
          >
            <ChevronRight className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {/* ─── SPEAKER NOTES DRAWER ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isNotesOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: EASE_KINETIC }}
            className="absolute bottom-0 left-0 w-full bg-[#0A0B0D]/95 border-t border-[#2A2B30] p-6 z-[2000] backdrop-blur-xl"
          >
            <div className="max-w-4xl mx-auto flex justify-between items-start">
              <div>
                <div className="text-xs font-mono text-[#41A2D9] uppercase tracking-wider mb-1">
                  SCENE {String(currentIdx + 1).padStart(2, '0')} · {currentScene.category}
                </div>
                <h3 className="text-xl font-bold mb-2">{currentScene.title}</h3>
                <p className="text-sm text-[#8E929B] leading-relaxed max-w-3xl">{currentScene.speakerNotes}</p>
              </div>
              <button 
                onClick={toggleNotes}
                className="text-xs font-mono text-[#8E929B] hover:text-[#F0F2F5] px-3 py-1 border border-[#2A2B30] rounded"
              >
                ✕ Close [ESC]
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default PitchDeckView;
