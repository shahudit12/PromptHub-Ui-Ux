/**
 * src/services/voice/deepgramVoiceAgentClient.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Official Deepgram Voice Agent API Web Client for PromptHub.
 *
 * Implements:
 * 1. Deepgram Voice Agent WebSocket protocol (`wss://agent.deepgram.com/agent`).
 * 2. Real-time microphone audio capture (48kHz/16kHz Linear16 PCM binary frames).
 * 3. Real-time audio playback (24kHz Linear16 PCM binary frames via Web Audio API).
 * 4. Zero-latency interruption: Stops playback immediately when user starts speaking.
 * 5. Structured function call dispatch to PromptHub Workspace Action Bridge.
 * 6. Graceful fallback to server-proxied streaming turn engine if Agent WS is blocked.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { buildDeepgramAgentSettings, YUNO_GREETING, YUNO_SYSTEM_PROMPT } from '../../config/yunoVoiceConfig';
import { workspaceActionBridge } from '../work/workspaceActionBridge';
import { YunoBriefCompiler, type StructuredProjectBrief } from './yunoBriefCompiler';
import { normalizeTextForSpeech, stripThinkingProcess } from './speechNormalizer';
import { deepgramProvider } from './deepgramProvider';
import { voiceUsageService } from './voiceUsageService';
import { aiGateway } from '../ai/aiGateway';
import { logger } from '../../utils/logger';

export type YunoVoiceAgentStatus =
  | 'disconnected'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'mic_prompt'
  | 'mic_denied'
  | 'limit_reached'
  | 'error';

export interface YunoVoiceAgentEvents {
  onStatusChange: (status: YunoVoiceAgentStatus) => void;
  onAudioLevel: (level: number) => void;
  onTranscript: (role: 'user' | 'assistant', text: string) => void;
  onBriefUpdated: (brief: StructuredProjectBrief) => void;
  onError: (error: string) => void;
}

export interface YunoSessionOptions {
  selectedModel: string;
  projectId?: string;
  sessionId?: string;
  userId?: string;
  speakModel?: string;
  listenModel?: string;
  thinkModel?: string;
}

export class DeepgramVoiceAgentClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;

  // Audio Playback Clock & Active Sources (Sample-accurate zero-latency scheduler)
  private playbackContext: AudioContext | null = null;
  private nextScheduledTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isAssistantSpeaking = false;
  private activeAudioElement: HTMLAudioElement | null = null;

  // Real-time browser speech recognition (continuous streaming transcription)
  private speechRecognition: any = null;
  private isRecognizing = false;

  private briefCompiler: YunoBriefCompiler;
  private options: YunoSessionOptions;
  private events: YunoVoiceAgentEvents;
  private status: YunoVoiceAgentStatus = 'disconnected';
  private isMuted = false;
  private fallbackActive = false;
  private hasGreeted = false;
  private isProcessingTurn = false;
  private lastAssistantSpokenText = '';
  private lastAssistantSpeechEndTime = 0;

  public getStatus(): YunoVoiceAgentStatus {
    return this.status;
  }

  public isFallbackMode(): boolean {
    return this.fallbackActive;
  }

  public isSpeechRecognizing(): boolean {
    return this.isRecognizing;
  }

  constructor(options: YunoSessionOptions, events: YunoVoiceAgentEvents) {
    let model = options.selectedModel;
    if (!model || model === 'prompthub/auto-free' || model === 'auto-free' || model === 'prompthub/auto' || model === 'auto' || model === 'google/gemini-2.0-flash-exp:free') {
      model = 'openrouter/free';
    } else if (model === 'prompthub/auto-paid' || model === 'auto-paid') {
      model = 'anthropic/claude-3.5-sonnet';
    }
    this.options = { ...options, selectedModel: model };
    this.events = events;
    const projId = options.projectId || 'workspace_proj';
    const sessId = options.sessionId || `session_${Date.now()}`;
    this.briefCompiler = new YunoBriefCompiler(projId, sessId, model);
  }

  public getBrief(): StructuredProjectBrief {
    return this.briefCompiler.getBrief();
  }

  public updateModel(modelId: string): void {
    let model = modelId;
    if (!model || model === 'prompthub/auto-free' || model === 'auto-free' || model === 'prompthub/auto' || model === 'auto' || model === 'google/gemini-2.0-flash-exp:free') {
      model = 'openrouter/free';
    } else if (model === 'prompthub/auto-paid' || model === 'auto-paid') {
      model = 'anthropic/claude-3.5-sonnet';
    }
    this.options.selectedModel = model;
    this.briefCompiler.updateFields({
      selectedModel: {
        modelId: model,
        provider: 'openrouter',
        isFree: model.includes(':free') || model.includes('openrouter/free'),
        lane: 'free_router',
        estimatedCostCredits: 0,
      },
    });
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  private setStatus(newStatus: YunoVoiceAgentStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.events.onStatusChange(newStatus);
    }
  }

  private usageInterval: any = null;

  private startUsageTracker(): void {
    this.clearUsageTracker();
    this.usageInterval = setInterval(() => {
      // Strictly track usage only when actively connected, user is unmuted, window is active, and in a voice turn
      if (
        !this.isMuted &&
        typeof document !== 'undefined' &&
        !document.hidden &&
        (this.status === 'listening' || this.status === 'speaking' || this.status === 'thinking')
      ) {
        const state = voiceUsageService.recordUsage(1, this.options.userId);
        if (state.isLimitReached) {
          this.stop();
          this.setStatus('limit_reached');
          this.events.onError('Daily voice limit reached (30 min/day). You can continue chatting via text!');
        }
      }
    }, 1000);
  }

  private clearUsageTracker(): void {
    if (this.usageInterval) {
      clearInterval(this.usageInterval);
      this.usageInterval = null;
    }
  }

  /**
   * Start Voice Session with Deepgram.
   */
  public async start(): Promise<void> {
    // If session is already connected and active, do not re-run start or duplicate greeting
    if (this.status === 'listening' || this.status === 'speaking' || this.status === 'thinking') {
      return;
    }

    // 0. Quota check: 30 minutes daily limit
    const quota = voiceUsageService.getQuotaState(this.options.userId);
    if (quota.isLimitReached) {
      this.setStatus('limit_reached');
      this.events.onError('Daily voice limit reached (30 min/day). Reset at midnight UTC.');
      return;
    }

    // 1. Permission Pre-flight check
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.setStatus('mic_denied');
      this.events.onError('Microphone is not supported in this browser or requires a secure HTTPS connection.');
      this.stop(true);
      return;
    }

    if (navigator.permissions?.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (perm.state === 'denied') {
          this.setStatus('mic_denied');
          this.events.onError('Microphone permission is blocked in browser settings. Please allow microphone access to talk with Yuno.');
          this.stop(true);
          return;
        }
      } catch {}
    }

    this.setStatus('connecting');

    try {
      // 2. Acquire microphone access intentionally
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      this.mediaStream = stream;

      // 3. Initialize audio visualizer capture and live browser speech recognition
      this.initAudioCapture(stream);
      this.initSpeechRecognition();
      this.startUsageTracker();

      // 4. Fetch authenticated token from backend or client env
      let token = (import.meta.env.VITE_DEEPGRAM_API_KEY as string)?.trim() || '';
      try {
        const tokenRes = await fetch('/api/voice/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData.token) {
            token = tokenData.token;
          }
        }
      } catch (tokenErr) {
        logger.warn('[Yuno Client] Could not fetch temporary token, using available credentials:', tokenErr);
      }

      // 5. Attempt direct Deepgram Voice Agent WebSocket connection
      let directConnected = false;
      if (token) {
        try {
          await this.connectVoiceAgentWebSocket(token);
          directConnected = true;
          this.fallbackActive = false;
          this.setStatus('listening');
        } catch (wsErr) {
          logger.warn('[Yuno Client] Agent WebSocket failed to handshake, switching to continuous voice turn engine:', wsErr);
        }
      }

      // 6. If direct WebSocket didn't connect, seamlessly activate continuous fallback mode
      if (!directConnected) {
        this.fallbackActive = true;
        this.setStatus('listening');

        // Greet the user cleanly in fallback mode (strictly once per session)
        if (!this.hasGreeted) {
          this.hasGreeted = true;
          const greetingSpoken = normalizeTextForSpeech(YUNO_GREETING);
          this.events.onTranscript('assistant', greetingSpoken);
          await this.synthesizeAndPlay(greetingSpoken);
        }
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.setStatus('mic_denied');
        this.events.onError('Microphone permission was not allowed. Please click allow to speak with Yuno.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.setStatus('error');
        this.events.onError('No microphone device was detected on your system.');
      } else {
        this.setStatus('error');
        this.events.onError(err.message || 'Microphone or connection error.');
      }
      this.stop(true);
    }
  }

  /**
   * Connect to Deepgram Voice Agent WebSocket (`wss://agent.deepgram.com/v1/agent/converse`)
   */
  private connectVoiceAgentWebSocket(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Deepgram official browser subprotocol: ['token', '<api_key_or_token>']
        const ws = new WebSocket('wss://agent.deepgram.com/v1/agent/converse', ['token', token]);
        this.ws = ws;
        ws.binaryType = 'arraybuffer';

        let connectionTimeout = setTimeout(() => {
          reject(new Error('Connection timed out to Deepgram Agent'));
        }, 6000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          // Send Deepgram Agent Settings JSON
          const settings = buildDeepgramAgentSettings({
            speakModel: this.options.speakModel || 'aura-2-thalia-en',
            listenModel: this.options.listenModel || 'nova-3',
            thinkModel: this.options.thinkModel || 'gpt-4o-mini',
          });
          ws.send(JSON.stringify(settings));
          this.setStatus('listening');
          resolve();
        };

        ws.onmessage = async (event) => {
          // Binary audio chunk from Deepgram Aura TTS
          if (event.data instanceof ArrayBuffer) {
            this.handleIncomingAudioChunk(event.data);
            return;
          }

          // JSON Control & Event messages
          try {
            const msg = JSON.parse(event.data);
            await this.handleAgentEvent(msg);
          } catch (jsonErr) {
            logger.warn('[Yuno Client] Failed to parse Deepgram message:', jsonErr);
          }
        };

        ws.onerror = () => {
          clearTimeout(connectionTimeout);
          reject(new Error('Deepgram WebSocket error'));
        };

        ws.onclose = (ev) => {
          logger.info(`[Yuno Client] Direct WebSocket closed (code ${ev.code}), maintaining voice assistant state`);
          this.ws = null;
          this.fallbackActive = true;
          if (this.status !== 'disconnected' && this.mediaStream) {
            this.setStatus('listening');
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Browser-native SpeechRecognition integration for instantaneous, real-time speech turns.
   */
  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch {}
      this.speechRecognition = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let silenceTimeout: any = null;
      let accumulatedFinal = '';

      recognition.onstart = () => {
        this.isRecognizing = true;
      };

      recognition.onresult = (event: any) => {
        if (this.isMuted) return;

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const piece = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            final += piece;
          } else {
            interim += piece;
          }
        }

        const rawCandidate = (final || interim).trim().toLowerCase();
        if (!rawCandidate) return;

        // Acoustic Echo Bleed Check: Ignore audio if it is simply laptop speaker bleed
        // of what the assistant was just saying or standard greeting phrases
        const isEchoBleed =
          (this.isAssistantSpeaking || Date.now() - this.lastAssistantSpeechEndTime < 1000) &&
          (this.lastAssistantSpokenText.includes(rawCandidate) ||
           rawCandidate.includes('yuno') ||
           rawCandidate.includes("what you'd like to create") ||
           rawCandidate.includes('build it together') ||
           rawCandidate.includes('prompthub assistant'));

        if (isEchoBleed) {
          return;
        }

        // Legitimate User Interruption: If assistant is speaking and user intentionally interrupts
        if (this.isAssistantSpeaking) {
          const isInterruptionCommand = /\b(stop|cancel|wait|pause|actually|hold on|no)\b/i.test(rawCandidate);
          if (isInterruptionCommand || rawCandidate.length > 5) {
            this.stopPlayback();
            this.setStatus('listening');
          } else {
            return;
          }
        }

        if (final.trim()) {
          accumulatedFinal = (accumulatedFinal + ' ' + final).trim();
        }

        const candidate = (accumulatedFinal || interim).trim();
        if (candidate.length > 1 && !this.isProcessingTurn) {
          if (silenceTimeout) clearTimeout(silenceTimeout);
          silenceTimeout = setTimeout(() => {
            const utterance = (accumulatedFinal || interim).trim();
            accumulatedFinal = '';
            if (utterance.length > 1 && !this.isProcessingTurn) {
              this.processTextTurn(utterance);
            }
          }, 850);
        }
      };

      recognition.onerror = (err: any) => {
        if (err.error === 'not-allowed') {
          this.setStatus('mic_denied');
        }
      };

      recognition.onend = () => {
        this.isRecognizing = false;
        if (this.status !== 'disconnected' && this.mediaStream) {
          try {
            recognition.start();
          } catch {}
        }
      };

      this.speechRecognition = recognition;
      try {
        recognition.start();
      } catch (startErr) {
        logger.warn('[Yuno Client] Speech recognition start notice:', startErr);
      }
    } catch (e) {
      logger.warn('[Yuno Client] Speech recognition init notice:', e);
    }
  }

  /**
   * Handle Deepgram Voice Agent Events
   */
  private async handleAgentEvent(event: any): Promise<void> {
    const type = event.type;

    if (type === 'UserStartedSpeaking') {
      // Immediate Interruption handling: Stop assistant audio playback instantly
      this.stopPlayback();
      this.setStatus('listening');
      return;
    }

    if (type === 'AgentStartedSpeaking') {
      this.setStatus('speaking');
      return;
    }

    if (type === 'AgentAudioDone') {
      this.setStatus('listening');
      return;
    }

    if (type === 'ConversationText') {
      const role = event.role === 'user' ? 'user' : 'assistant';
      const content = event.content || '';
      if (content.trim()) {
        this.events.onTranscript(role, content.trim());
      }
      return;
    }

    // Function Call from Deepgram Think Model
    if (type === 'FunctionCallRequest') {
      const callId = event.function_call_id;
      const fnName = event.function_name;
      const input = event.input || {};

      this.setStatus('thinking');
      const result = await this.executeFunction(fnName, input);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'FunctionCallResponse',
            function_call_id: callId,
            output: JSON.stringify(result),
          })
        );
      }
    }
  }

  /**
   * Execute Workspace Actions & Brief Operations
   */
  public async executeFunction(name: string, args: Record<string, any>): Promise<any> {
    try {
      if (name === 'get_workspace_context') {
        const ctx = await workspaceActionBridge.getProjectContext();
        return {
          status: 'success',
          active_project: ctx.projectName,
          selected_model: ctx.selectedModel,
          files_count: ctx.files.length,
          supported_deliverables: ctx.supportedDeliverables,
        };
      }

      if (name === 'update_project_brief') {
        const updated = this.briefCompiler.updateFields({
          objective: args.objective,
          audience: args.audience,
          deliverableType: args.deliverable_type,
          confirmedFacts: args.confirmed_facts,
          requiredFeatures: args.required_features,
          creativeDirection: args.creative_direction,
          exclusions: args.exclusions,
          selectedModel: args.selected_model,
          assumptions: args.assumptions,
          missingFacts: args.missing_facts,
        });
        workspaceActionBridge.updateProjectBrief(updated);
        this.events.onBriefUpdated(updated);
        return {
          status: 'success',
          message: 'Project brief updated and master prompt compiled.',
          brief_id: updated.id,
          deliverable_type: updated.deliverableType,
        };
      }

      if (name === 'display_brief') {
        const brief = this.briefCompiler.getBrief();
        workspaceActionBridge.displayBrief(brief, args.display_type || 'structured_brief');
        return {
          status: 'success',
          message: 'Displaying complete brief in workspace panel.',
          master_prompt: brief.masterPrompt,
        };
      }

      if (name === 'submit_master_prompt') {
        const brief = this.briefCompiler.getBrief();
        const masterPrompt = args.master_prompt || brief.masterPrompt;
        const deliverableType = args.deliverable_type || brief.deliverableType;
        let targetModel = args.model_id || brief.selectedModel || this.options.selectedModel;
        if (!targetModel || targetModel === 'prompthub/auto-free' || targetModel === 'auto-free' || targetModel === 'prompthub/auto' || targetModel === 'auto' || targetModel === 'google/gemini-2.0-flash-exp:free') {
          targetModel = 'openrouter/free';
        }
        const reqId = args.request_id || `req_yuno_${Date.now()}`;

        this.briefCompiler.updateFields({ status: 'submitted' });
        const res = await workspaceActionBridge.submitMasterPrompt(
          masterPrompt,
          deliverableType,
          targetModel,
          reqId
        );

        return {
          status: res.status || 'started',
          job_id: res.jobId,
          message: 'Master prompt submitted to workspace execution engine.',
        };
      }

      if (name === 'refine_artifact') {
        const res = await workspaceActionBridge.refineArtifact(
          args.instruction,
          args.target_file,
          args.request_id
        );
        return {
          status: res.status || 'building',
          job_id: res.jobId,
          message: 'Refinement initiated in sandbox.',
        };
      }

      if (name === 'select_model') {
        const res = await workspaceActionBridge.selectModel(args.model_query);
        this.updateModel(res.modelId);
        return {
          status: 'success',
          selected_model: res.modelId,
          is_free: res.isFree,
          message: res.message,
        };
      }

      if (name === 'get_job_status') {
        const status = await workspaceActionBridge.getJobStatus(args.job_id);
        return {
          status: status.status,
          progress: status.progress,
          message: status.message,
          files_count: status.filesCount,
        };
      }

      if (name === 'end_conversation') {
        this.stop();
        return { status: 'success', message: 'Conversation ended politely.' };
      }

      if (name === 'do_arithmetic') {
        const op = args.operation;
        const nums = (args.numbers || []).map((n: string) => parseFloat(n)).filter((n: number) => !isNaN(n));
        let res = 0;
        if (op === 'add') res = nums.reduce((a: number, b: number) => a + b, 0);
        else if (op === 'subtract') res = nums.reduce((a: number, b: number) => a - b);
        else if (op === 'multiply') res = nums.reduce((a: number, b: number) => a * b, 1);
        else if (op === 'divide') res = nums.reduce((a: number, b: number) => (b === 0 ? a : a / b));
        return { status: 'success', result: res };
      }

      return { status: 'error', message: `Unknown function "${name}"` };
    } catch (fnErr: any) {
      logger.error(`[Yuno Function Error] ${name}:`, fnErr);
      return { status: 'failed', error: fnErr.message || 'Execution error' };
    }
  }

  /**
   * Microphone Capture & Linear16 PCM streaming with VAD Noise Gate & Speaker Echo Suppression
   */
  private initAudioCapture(stream: MediaStream): void {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 48000,
    });
    this.audioContext = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    this.audioSource = source;

    // 4096 samples at 48kHz = ~85ms buffer packet
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    this.scriptProcessor = processor;

    let speechHangoverFrames = 0;
    const HANGOVER_FRAME_COUNT = 4; // ~340ms hangover to prevent clipping natural word endings
    const SILENCE_RMS_THRESHOLD = 0.012; // Noise gate: ignores room hum, laptop fan, and faint breaths ("pf")
    const ECHO_RMS_THRESHOLD = 0.045; // Suppression gate: ignores speaker bleed while assistant speaks

    processor.onaudioprocess = (e) => {
      if (this.isMuted) return;

      const inputData = e.inputBuffer.getChannelData(0);

      // 1. Calculate audio RMS level for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.events.onAudioLevel(Math.min(1, rms * 5));

      // 2. Echo Suppression: If assistant is currently speaking through laptop speakers
      if (this.isAssistantSpeaking) {
        if (rms < ECHO_RMS_THRESHOLD) {
          // Speaker bleed detected: drop completely to prevent self-interruption loop
          return;
        }
        // User intentionally speaking over assistant: interrupt immediately like ChatGPT
        this.stopPlayback();
        this.setStatus('listening');
      }

      // 3. VAD Noise Gate: Prevent room hiss/breaths ("pf") from sending phantom speech
      if (rms < SILENCE_RMS_THRESHOLD) {
        if (speechHangoverFrames > 0) {
          speechHangoverFrames--;
        } else {
          // Silence: drop non-speech background noise
          return;
        }
      } else {
        speechHangoverFrames = HANGOVER_FRAME_COUNT;
      }

      // 4. Convert Float32 to 16-bit PCM
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // 5. Stream binary frame to Deepgram Agent WS if active
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(pcm16.buffer);
      }
    };

    // Route processor through silenceGain to prevent acoustic feedback loop
    const silenceGain = audioCtx.createGain();
    silenceGain.gain.value = 0;
    source.connect(processor);
    processor.connect(silenceGain);
    silenceGain.connect(audioCtx.destination);
  }

  /**
   * Handle incoming raw 24kHz Linear16 PCM chunks from Deepgram Aura TTS.
   * Uses sample-accurate Web Audio clock scheduling to eliminate gaps, crackle, and buffer underrun.
   */
  private handleIncomingAudioChunk(arrayBuffer: ArrayBuffer): void {
    if (!this.playbackContext || this.playbackContext.state === 'closed') {
      this.playbackContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      this.nextScheduledTime = 0;
    }

    if (this.playbackContext.state === 'suspended') {
      this.playbackContext.resume();
    }

    const pcm16 = new Int16Array(arrayBuffer);
    if (pcm16.length === 0) return;

    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }

    const audioBuffer = this.playbackContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const now = this.playbackContext.currentTime;
    // Add 30ms lead time if playback buffer has drained or on initial chunk
    if (this.nextScheduledTime < now) {
      this.nextScheduledTime = now + 0.03;
    }

    const source = this.playbackContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.playbackContext.destination);
    source.start(this.nextScheduledTime);
    this.activeSources.push(source);

    this.isAssistantSpeaking = true;
    this.setStatus('speaking');

    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
      if (this.activeSources.length === 0) {
        this.isAssistantSpeaking = false;
        if (this.status === 'speaking') {
          this.setStatus('listening');
        }
      }
    };

    this.nextScheduledTime += audioBuffer.duration;
  }

  /**
   * Interruption: Stops playback immediately and clears all scheduled audio buffers
   */
  public stopPlayback(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.activeSources = [];
    if (this.playbackContext && this.playbackContext.state !== 'closed') {
      this.nextScheduledTime = this.playbackContext.currentTime;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
        this.activeAudioElement.currentTime = 0;
      } catch {}
      this.activeAudioElement = null;
    }
    this.isAssistantSpeaking = false;
    this.lastAssistantSpeechEndTime = Date.now();
  }

  /**
   * Resilient synthesis and playback via Deepgram Aura TTS with Web Speech API fallback.
   */
  private async synthesizeAndPlay(text: string): Promise<void> {
    const cleanText = text.replace(/[*_#`]/g, '').trim();
    if (!cleanText) return;

    this.stopPlayback();
    this.setStatus('speaking');
    this.isAssistantSpeaking = true;
    this.lastAssistantSpokenText = cleanText.toLowerCase();

    let deepgramSucceeded = false;
    try {
      const res = await deepgramProvider.synthesize(cleanText, this.options.speakModel || 'aura-2-thalia-en');
      if (res.audioUrl) {
        const audio = new Audio(res.audioUrl);
        this.activeAudioElement = audio;
        await new Promise<void>((resolve) => {
          audio.onended = () => {
            this.activeAudioElement = null;
            deepgramSucceeded = true;
            resolve();
          };
          audio.onerror = () => {
            this.activeAudioElement = null;
            resolve();
          };
          audio.play().catch(() => {
            this.activeAudioElement = null;
            resolve();
          });
        });
      }
    } catch (e) {
      logger.warn('[Yuno Client] Deepgram TTS notice, checking Web Speech synthesis:', e);
    }

    // Fallback: If Deepgram TTS failed or is blocked, speak with browser native synthesis
    if (!deepgramSucceeded && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        await new Promise<void>((resolve) => {
          const utter = new SpeechSynthesisUtterance(cleanText);
          utter.rate = 1.05;
          utter.pitch = 1.0;
          utter.onend = () => resolve();
          utter.onerror = () => resolve();
          window.speechSynthesis.speak(utter);
        });
      } catch {}
    }

    this.isAssistantSpeaking = false;
    if (this.status === 'speaking') {
      this.setStatus('listening');
    }
  }

  /**
   * Text Utterance processing (e.g. typing or fallback STT turns)
   */
  public async processTextTurn(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || this.isProcessingTurn) return;

    this.isProcessingTurn = true;
    this.stopPlayback();
    this.setStatus('thinking');
    this.events.onTranscript('user', trimmed);

    try {
      // 1. Check if user is asking to build or execute
      const lower = trimmed.toLowerCase();
      const isBuildIntent =
        /\b(build it|create it|generate it|start creation|make it|publish it|proceed|lets build|start build)\b/i.test(lower) ||
        (lower === 'yes' && (this.briefCompiler.getBrief().objective?.length ?? 0) > 0) ||
        (lower === 'do it' && (this.briefCompiler.getBrief().objective?.length ?? 0) > 0);

      if (isBuildIntent) {
        const brief = this.briefCompiler.getBrief();
        if (brief.masterPrompt || brief.objective) {
          const buildReply = "Starting creation in your workspace now. I'm building your deliverable in the sandbox.";
          this.events.onTranscript('assistant', buildReply);
          await this.synthesizeAndPlay(buildReply);
          await this.executeFunction('submit_master_prompt', {
            master_prompt: brief.masterPrompt,
            deliverable_type: brief.deliverableType,
          });
          return;
        }
      }

      // 2. Extract and preserve user requirements into the active brief
      let inferredType = this.briefCompiler.getBrief().deliverableType;
      let creativeDirection = this.briefCompiler.getBrief().creativeDirection;
      const features = [...(this.briefCompiler.getBrief().requiredFeatures || [])];

      if (/\b(website|landing page|web app|calculator|portfolio|site)\b/i.test(lower)) {
        inferredType = 'interactive_web_app';
      } else if (/\b(report|doc|document|summary)\b/i.test(lower)) {
        inferredType = 'written_report';
      }

      if (/\b(anime|manga|scroll|scroll down|animation)\b/i.test(lower)) {
        creativeDirection = 'Anime & Manga aesthetic with fluid scroll-down panel animations';
        if (!features.includes('Manga-style scroll down storytelling animations')) {
          features.push('Manga-style scroll down storytelling animations');
        }
        if (!features.includes('Anime themed visual composition and typography')) {
          features.push('Anime themed visual composition and typography');
        }
      }

      const updatedBrief = this.briefCompiler.updateFields({
        objective: this.briefCompiler.getBrief().objective
          ? `${this.briefCompiler.getBrief().objective} (Add: ${trimmed})`
          : trimmed,
        deliverableType: inferredType,
        creativeDirection,
        requiredFeatures: features,
      });
      workspaceActionBridge.updateProjectBrief(updatedBrief);
      this.events.onBriefUpdated(updatedBrief);

      // 3. Model execution with strict anti-thinking instructions
      let targetModel = this.options.selectedModel || 'openrouter/free';
      if (targetModel === 'prompthub/auto-free' || targetModel === 'auto-free' || targetModel === 'prompthub/auto' || targetModel === 'auto' || targetModel === 'google/gemini-2.0-flash-exp:free') {
        targetModel = 'openrouter/free';
      }

      const prompt = `${YUNO_SYSTEM_PROMPT}

CRITICAL RULES FOR THIS SPOKEN TURN:
1. Speak directly to the user as Yuno, an expert creative partner.
2. ABSOLUTELY DO NOT output any thinking process, reasoning, planning, internal monologue, prefixes like "Here's a thinking process:", asterisks, markdown headings, bullet points, or JSON.
3. Keep your spoken response strictly to 1 or 2 concise, natural sentences.
4. Enthusiastically acknowledge what the user wants, confirm you updated the project brief, and ask if they are ready for you to build the deliverable in the workspace.

[Active Project Brief]:
${JSON.stringify(updatedBrief, null, 2)}

[User Said]: "${trimmed}"`;

      let spokenText = '';
      try {
        const aiResponse = await aiGateway.executePrompt(prompt, {
          modelId: targetModel,
          temperature: 0.3,
          maxTokens: 512,
          executionMode: 'raw',
        });

        const rawOutput = aiResponse.output || '';
        let cleanOutput = stripThinkingProcess(rawOutput);

        if (!cleanOutput || cleanOutput.length < 5 || /^(here's a thinking|analyze user input)/i.test(cleanOutput)) {
          cleanOutput = `I've updated your project brief with the ${creativeDirection || 'new requirements'}. Would you like me to build it in the workspace now?`;
        }

        spokenText = normalizeTextForSpeech(cleanOutput);
        spokenText = spokenText.replace(/^[\"'\s]+|[\"'\s]+$/g, '').trim();

        // Guard: strictly ban any reasoning words from the transcript
        if (/^(here's a thinking|analyze user input|thought process)/i.test(spokenText)) {
          spokenText = "I've updated your project brief with your requirements. Ready for me to build it in your workspace?";
        }

        const sentences = spokenText.match(/[^.!?]+[.!?]+/g);
        if (sentences && sentences.length > 0) {
          spokenText = sentences.slice(0, 3).join(' ').trim();
        }
      } catch (promptErr) {
        logger.warn('[Yuno Client] LLM turn error, using conversational brief synthesis:', promptErr);
        if (creativeDirection) {
          spokenText = `I've updated your project brief with ${creativeDirection}. Would you like me to build it now?`;
        } else if (inferredType === 'interactive_web_app') {
          spokenText = "I've noted that requirement and updated your website brief. Ready to build it in the sandbox?";
        } else {
          spokenText = "I've updated your project brief with those requirements. Shall we start creation in the workspace?";
        }
      }

      if (!spokenText) {
        spokenText = "I've noted that requirement and updated your workspace brief. Ready to build?";
      }

      this.events.onTranscript('assistant', spokenText);
      await this.synthesizeAndPlay(spokenText);
    } catch (err: any) {
      logger.error('[Yuno Client] Unexpected error during turn:', err);
      const fallbackSpoken = "I've noted that and updated your project brief. Ready for me to build it in the workspace?";
      this.events.onTranscript('assistant', fallbackSpoken);
      try {
        await this.synthesizeAndPlay(fallbackSpoken);
      } catch {}
      this.setStatus('listening');
    } finally {
      this.isProcessingTurn = false;
    }
  }

  /**
   * Complete teardown and resource cleanup
   */
  public stop(preserveStatus: boolean = false): void {
    this.clearUsageTracker();
    this.stopPlayback();

    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch {}
      this.speechRecognition = null;
    }
    this.isRecognizing = false;

    if (this.ws) {
      try {
        this.ws.close(1000, 'User ended voice session');
      } catch {}
      this.ws = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.playbackContext && this.playbackContext.state !== 'closed') {
      this.playbackContext.close().catch(() => {});
      this.playbackContext = null;
    }

    if (!preserveStatus) {
      this.setStatus('disconnected');
    }
  }
}
