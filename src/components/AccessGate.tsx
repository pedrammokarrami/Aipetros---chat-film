import { useEffect, useState } from 'react';
import {
  Lock,
  Mail,
  MessageSquare,
  Send,
  ShieldCheck,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { InviteChannel } from '../types';
import { TypewriterText } from './TypewriterText';
import { soundEngine } from '../utils/soundEngine';

interface AccessGateProps {
  onUnlock: (channel: InviteChannel) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const INVITE_OPTIONS: Array<{
  id: InviteChannel;
  label: string;
  detail: string;
  icon: typeof Mail;
}> = [
  {
    id: 'TELEGRAM',
    label: 'Telegram',
    detail: 'Dispatch encrypted bot token',
    icon: Send,
  },
  {
    id: 'WHATSAPP',
    label: 'WhatsApp',
    detail: 'Send peer invite relay',
    icon: MessageSquare,
  },
  {
    id: 'SMS',
    label: 'SMS',
    detail: 'Transmit one-time cipher code',
    icon: Smartphone,
  },
  {
    id: 'EMAIL',
    label: 'Email',
    detail: 'Forward dossier clearance key',
    icon: Mail,
  },
];

export function AccessGate({
  onUnlock,
  isMuted,
  onToggleMute,
}: AccessGateProps) {
  const [phase, setPhase] = useState<'LOCKED' | 'DECRYPTING' | 'REVEALING'>(
    'LOCKED'
  );
  const [selectedChannel, setSelectedChannel] =
    useState<InviteChannel | null>(null);
  const [progress, setProgress] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([
    'TERMINAL GATEWAY INITIALIZED // AES-256-GCM',
    'AWAITING PEER INVITATION DISPATCH TO ISSUE CLEARANCE KEY...',
  ]);

  const inviteCode = 'CNET-7F9A-K204';

  const handleDispatchInvite = (channel: InviteChannel) => {
    if (phase !== 'LOCKED') return;
    soundEngine.playConfirmBeep();
    setSelectedChannel(channel);
    setPhase('DECRYPTING');
    setProgress(12);
    setLogLines([
      `INVITE PACKET DISPATCHED VIA ${channel} // CODE: ${inviteCode}`,
      'ESTABLISHING LOCAL_NODE P2P HANDSHAKE...',
    ]);
  };

  useEffect(() => {
    if (phase !== 'DECRYPTING' || !selectedChannel) return;

    const steps = [
      {
        delay: 130,
        pct: 42,
        log: 'VERIFYING ZERO-STORAGE RELAY SIGNATURE [OK]',
      },
      {
        delay: 300,
        pct: 78,
        log: 'DECRYPTING ARCHIVE INDEX & WATCH LOBBY KEYS...',
      },
      {
        delay: 480,
        pct: 100,
        log: 'DECRYPTING ACCESS KEY... 100% // CLEARANCE GRANTED',
      },
    ];

    const timers: number[] = [];

    steps.forEach((step) => {
      const t = window.setTimeout(() => {
        soundEngine.playKeyTick();
        setProgress(step.pct);
        setLogLines((prev) => [...prev, step.log]);
      }, step.delay);
      timers.push(t);
    });

    const revealTimer = window.setTimeout(() => {
      soundEngine.playSecureChime();
      setPhase('REVEALING');
    }, 640);
    timers.push(revealTimer);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [phase, selectedChannel]);

  useEffect(() => {
    if (phase !== 'REVEALING' || !selectedChannel) return;
    const completeTimer = window.setTimeout(() => {
      onUnlock(selectedChannel);
    }, 500);
    return () => window.clearTimeout(completeTimer);
  }, [phase, selectedChannel, onUnlock]);

  return (
    <div
      data-testid="access-gate"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-[#070B09] text-[#E0EFE6] terminal-grid p-4 sm:p-6"
    >
      <div className="crt-scanlines fixed inset-0 z-0 opacity-45" />

      {/* Top minimal utility bar */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between border-b border-[#1C2E24] bg-[#070B09]/90 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="font-mono text-xs tracking-wider text-emerald-400">
          SYSTEM // CLASSIFIED_NET
        </div>
        <button
          type="button"
          onClick={() => onToggleMute()}
          aria-label={isMuted ? 'Unmute terminal audio' : 'Mute terminal audio'}
          className="inline-flex min-h-[36px] items-center gap-2 border border-[#264834] bg-[#0B120E] px-3 py-1.5 font-mono text-xs text-emerald-300 transition-all hover:border-emerald-400 hover:bg-[#111B15] active:translate-y-[1px]"
        >
          {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          <span>{isMuted ? 'AUDIO MUTED' : 'AUDIO ON'}</span>
        </button>
      </div>

      {phase === 'REVEALING' ? (
        <div
          key="emblem-reveal"
          className="animate-emblem-reveal relative z-10 flex flex-col items-center justify-center text-center"
        >
          <div className="relative flex h-28 w-28 items-center justify-center border-2 border-emerald-400 bg-[#0B120E] shadow-[0_0_50px_rgba(34,197,94,0.28)]">
            <span className="pointer-events-none absolute -top-2 -left-2 h-4 w-4 border-t-2 border-l-2 border-emerald-300" />
            <span className="pointer-events-none absolute -top-2 -right-2 h-4 w-4 border-t-2 border-r-2 border-emerald-300" />
            <span className="pointer-events-none absolute -bottom-2 -left-2 h-4 w-4 border-b-2 border-l-2 border-emerald-300" />
            <span className="pointer-events-none absolute -bottom-2 -right-2 h-4 w-4 border-b-2 border-r-2 border-emerald-300" />
            <ShieldCheck className="h-12 w-12 text-emerald-400" />
          </div>
          <div className="mt-6 font-mono text-2xl font-bold tracking-[0.22em] text-emerald-400 sm:text-3xl">
            CLASSIFIED_NET
          </div>
          <div className="mt-2 font-mono text-xs tracking-widest text-emerald-200/80">
            CLEARANCE VERIFIED // ENTERING ARCHIVE
          </div>
        </div>
      ) : (
        <div
          key="gate-panel"
          className="animate-fade-slide relative z-10 mt-10 w-full max-w-2xl"
        >
            {/* Dossier Folder Tab */}
            <div className="flex items-end justify-between">
              <div className="inline-flex items-center gap-2 border-t border-l border-r border-red-500/45 bg-[#0B120E] px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-red-400 uppercase">
                <Lock className="h-3.5 w-3.5" />
                <span>ACCESS RESTRICTED // INVITATION PROTOCOL REQUIRED</span>
              </div>
              <span className="hidden font-mono text-[11px] text-emerald-500/80 sm:inline">
                KEY: {inviteCode}
              </span>
            </div>

            {/* Main Terminal Gate Container */}
            <div className="relative border border-[#244231] bg-[#0B120E] p-5 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.65)]">
              <span className="pointer-events-none absolute -top-px -left-px h-3 w-3 border-t-2 border-l-2 border-emerald-400" />
              <span className="pointer-events-none absolute -top-px -right-px h-3 w-3 border-t-2 border-r-2 border-emerald-400" />
              <span className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 border-emerald-400" />
              <span className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-emerald-400" />

              <div className="flex items-start justify-between gap-4 border-b border-[#1C2E24] pb-5">
                <div>
                  <h1 className="font-mono text-xl font-bold tracking-tight text-emerald-400 sm:text-2xl">
                    <TypewriterText
                      text="SYSTEM // CLASSIFIED_NET"
                      speedMs={24}
                      showCursor
                    />
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#A5C2B1]">
                    Private intelligence-dossier network for movies, TV series,
                    and anime watch lobbies. Dispatch one encrypted invitation
                    to unlock terminal access and earn +25 Peer Reputation.
                  </p>
                </div>
              </div>

              {phase === 'LOCKED' ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between font-mono text-xs text-amber-400">
                    <span>STEP 01 · DISPATCH 1 INVITE TO UNLOCK</span>
                    <span className="text-[#789785]">INSTANT CLEARANCE</span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {INVITE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleDispatchInvite(option.id)}
                          className="group flex min-h-[64px] items-center gap-3.5 border border-[#233E2F] bg-[#0F1914] px-4 py-3 text-left transition-all duration-150 hover:border-emerald-400 hover:bg-[#14231B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:translate-y-[1px] active:scale-[0.99]"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#2B4E3A] bg-[#09100C] text-emerald-400 transition-colors group-hover:border-emerald-400 group-hover:bg-emerald-500/15">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-sm font-semibold text-[#E8F5ED] group-hover:text-emerald-300">
                              Invite via {option.label}
                            </div>
                            <div className="truncate text-xs text-[#82A390]">
                              {option.detail}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-semibold text-emerald-400">
                      DECRYPTING ACCESS KEY... {progress}%
                    </span>
                    <span className="text-amber-400">
                      CHANNEL: {selectedChannel}
                    </span>
                  </div>

                  {/* Decryption Progress Bar */}
                  <div
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-3 w-full border border-emerald-500/40 bg-[#070B09] p-0.5"
                  >
                    <div
                      style={{ width: `${progress}%` }}
                      className="h-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.65)] transition-[width] duration-250 ease-out"
                    />
                  </div>
                </div>
              )}

              {/* Live Terminal Log Output */}
              <div className="mt-6 border border-[#1A2C22] bg-[#070B09] p-3.5 font-mono text-xs leading-relaxed text-emerald-300/90">
                {logLines.map((line, idx) => (
                  <div key={`${line}-${idx}`} className="flex gap-2">
                    <span className="select-none text-emerald-600">&gt;</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
