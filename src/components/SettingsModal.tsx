import { useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  Lock,
  Moon,
  Radio,
  Server,
  Sun,
  X,
} from 'lucide-react';
import type { BridgeSettings } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface SettingsModalProps {
  open: boolean;
  settings: BridgeSettings;
  isDark: boolean;
  onToggleTheme: () => void;
  onUpdateSettings: (next: BridgeSettings) => void;
  onGenerateShortLink: (kind: 'telegram' | 'p2p') => void;
  onRelockGate: () => void;
  onClose: () => void;
}

export function SettingsModal({
  open,
  settings,
  isDark,
  onToggleTheme,
  onUpdateSettings,
  onGenerateShortLink,
  onRelockGate,
  onClose,
}: SettingsModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!open) return null;

  const toggleKey = (
    key:
      | 'localP2pMesh'
      | 'localStreamServer'
      | 'telegramFailover'
      | 'zeroStorageRouting'
  ) => {
    soundEngine.playKeyTick();
    onUpdateSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handleCopy = (id: string, url: string) => {
    soundEngine.playConfirmBeep();
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const toggleRows: Array<{
    key:
      | 'localP2pMesh'
      | 'localStreamServer'
      | 'telegramFailover'
      | 'zeroStorageRouting';
    title: string;
    detail: string;
    activeMeta: string;
  }> = [
    {
      key: 'localP2pMesh',
      title: 'Local P2P Mesh',
      detail:
        'Direct peer-to-peer WebRTC signaling for low-latency lobby chat and private DMs.',
      activeMeta: 'MESH ACTIVE · 14ms RTT',
    },
    {
      key: 'localStreamServer',
      title: 'Local Stream Server',
      detail:
        'Host local cinema/anime files over your encrypted LAN/relay bridge at 127.0.0.1:8443.',
      activeMeta: 'RELAY LISTENING · PORT 8443',
    },
    {
      key: 'telegramFailover',
      title: 'Telegram Bot Auto-Failover & Link Generator',
      detail:
        'Automatically route invite links and stream relays through your Telegram bot bridge if P2P drops.',
      activeMeta: 'BOT BRIDGE ARMED',
    },
    {
      key: 'zeroStorageRouting',
      title: 'Zero-Storage Free Cloud Auto-Routing',
      detail:
        'Route encrypted packets strictly in volatile RAM with zero persistent disk storage.',
      activeMeta: 'ZERO-DISK EPHEMERAL',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="animate-modal-pop max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-[#CDD8D1] bg-white shadow-2xl dark:border-emerald-500/45 dark:bg-[#0B120E]"
      >
        <div className="flex items-center justify-between border-b border-[#CDD8D1] bg-[#F5F8F6] px-5 py-3.5 dark:border-[#1C2E24] dark:bg-[#0F1914]">
          <h2
            id="settings-modal-title"
            className="flex items-center gap-2 font-mono text-sm font-bold text-emerald-800 dark:text-emerald-400"
          >
            <Server className="h-4 w-4" />
            <span>LOCAL NODE & TELEGRAM BRIDGE SETTINGS</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bridge and node settings"
            className="p-1 text-[#5D7266] hover:text-[#111915] dark:text-[#88A795] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Display Theme Mode */}
          <div className="flex items-center justify-between gap-4 border border-[#E1E9E4] bg-[#F8FAF8] p-4 dark:border-[#1B2E23] dark:bg-[#0F1914]">
            <div>
              <div className="font-mono text-xs font-bold text-[#111915] dark:text-[#E8F5ED]">
                TERMINAL DISPLAY MODE
              </div>
              <div className="mt-0.5 text-xs text-[#43574B] dark:text-[#9BB8A7]">
                Switch between Dark CRT Phosphor (#070B09) and Archival Paper
                Light mode.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playKeyTick();
                onToggleTheme();
              }}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="inline-flex min-h-[38px] shrink-0 items-center gap-2 border border-emerald-700 bg-emerald-700 px-3.5 font-mono text-xs font-semibold text-white dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300"
            >
              {isDark ? (
                <>
                  <Moon className="h-3.5 w-3.5" />
                  <span>DARK CRT</span>
                </>
              ) : (
                <>
                  <Sun className="h-3.5 w-3.5" />
                  <span>ARCHIVAL LIGHT</span>
                </>
              )}
            </button>
          </div>

          {/* One-Click Bridge & Node Toggles */}
          <div className="divide-y divide-[#E1E9E4] border border-[#E1E9E4] dark:divide-[#182920] dark:border-[#182920]">
            {toggleRows.map((row) => {
              const enabled = settings[row.key];
              return (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#111915] dark:text-[#E8F5ED]">
                        {row.title}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-semibold ${
                          enabled
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-[#6A7E72] dark:text-[#6A8876]'
                        }`}
                      >
                        {enabled ? row.activeMeta : 'STANDBY'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#43574B] dark:text-[#9BB8A7]">
                      {row.detail}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Toggle ${row.title}`}
                    onClick={() => toggleKey(row.key)}
                    className={`relative inline-flex h-8 w-14 shrink-0 items-center border p-0.5 transition-colors ${
                      enabled
                        ? 'border-emerald-600 bg-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/30'
                        : 'border-[#CDD8D1] bg-[#E3EAE5] dark:border-[#244231] dark:bg-[#070B09]'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transition-transform ${
                        enabled
                          ? 'translate-x-6 bg-white dark:bg-emerald-300'
                          : 'translate-x-0 bg-[#6A7E72] dark:bg-[#3A5947]'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Custom Server-Branded Short Link Generator */}
          <div className="border border-[#CDD8D1] bg-[#F8FAF8] p-4 dark:border-[#1D3226] dark:bg-[#0F1914]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#111915] dark:text-[#E8F5ED]">
                <Link2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                <span>CUSTOM SERVER-BRANDED SHORT LINKS</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                DOMAIN: {settings.customRelayDomain}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={settings.customRelayDomain}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    customRelayDomain: e.target.value,
                  })
                }
                aria-label="Custom relay domain"
                className="min-h-[40px] flex-1 border border-[#CDD8D1] bg-white px-3 font-mono text-xs text-[#111915] focus:border-emerald-600 focus:outline-none dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6]"
              />
              <button
                type="button"
                onClick={() => {
                  soundEngine.playConfirmBeep();
                  onGenerateShortLink('telegram');
                }}
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 border border-emerald-700 bg-emerald-700 px-3.5 font-mono text-xs font-semibold text-white hover:bg-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>GENERATE TELEGRAM LINK</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playConfirmBeep();
                  onGenerateShortLink('p2p');
                }}
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 border border-[#CDD8D1] bg-white px-3.5 font-mono text-xs font-semibold text-[#111915] hover:border-emerald-600 dark:border-[#244231] dark:bg-[#0B120E] dark:text-emerald-300"
              >
                <span>+ P2P LINK</span>
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {settings.generatedLinks.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 border border-[#E1E9E4] bg-white px-3 py-2 font-mono text-xs dark:border-[#1B2E23] dark:bg-[#070B09]"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] text-[#5D7266] dark:text-[#789684]">
                      {item.label} · {item.createdAt}
                    </div>
                    <div className="truncate font-semibold text-emerald-800 dark:text-emerald-400">
                      {item.url}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.id, item.url)}
                    className="inline-flex min-h-[34px] shrink-0 items-center gap-1 border border-[#CDD8D1] px-2.5 text-[11px] text-[#283B30] hover:border-emerald-600 dark:border-[#244231] dark:text-emerald-300"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Security Gate Reset */}
          <div className="flex items-center justify-between gap-3 border-t border-[#E1E9E4] pt-4 dark:border-[#182920]">
            <span className="font-mono text-xs text-[#5D7266] dark:text-[#789684]">
              TERMINAL CLEARANCE: VERIFIED
            </span>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSecureChime();
                onRelockGate();
              }}
              className="inline-flex min-h-[38px] items-center gap-1.5 border border-red-500/40 bg-red-50 px-3 py-1.5 font-mono text-xs font-semibold text-red-700 hover:border-red-500 dark:bg-red-950/30 dark:text-red-300"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>RE-LOCK TERMINAL GATE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
