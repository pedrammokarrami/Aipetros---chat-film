import {
  Bell,
  Check,
  CheckCheck,
  Radio,
  UserPlus,
  X,
} from 'lucide-react';
import type { AlertItem, FriendRequest, NavTab } from '../types';
import { soundEngine } from '../utils/soundEngine';
import { DossierFrame } from './DossierFrame';
import { TypewriterText } from './TypewriterText';

interface AlertsViewProps {
  requests: FriendRequest[];
  alerts: AlertItem[];
  onAcceptRequest: (id: string) => void;
  onDeclineRequest: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigateAlert: (tab?: NavTab, targetId?: string) => void;
}

export function AlertsView({
  requests,
  alerts,
  onAcceptRequest,
  onDeclineRequest,
  onMarkAllRead,
  onNavigateAlert,
}: AlertsViewProps) {
  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-[#CDD8D1] pb-4 dark:border-[#1C2E24] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[11px] font-semibold tracking-wider text-emerald-700 dark:text-emerald-400">
            SIGNAL DISPATCH // ALERTS
          </div>
          <h1 className="mt-1 font-mono text-xl font-bold tracking-tight text-[#111915] dark:text-[#E5F3EA] sm:text-2xl">
            <TypewriterText text="Friend Requests & Activity Feed" speedMs={14} />
          </h1>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playKeyTick();
              onMarkAllRead();
            }}
            className="inline-flex min-h-[38px] items-center gap-1.5 border border-[#CDD8D1] bg-white px-3 py-1.5 font-mono text-xs font-semibold text-[#283B30] hover:border-emerald-600 dark:border-[#244231] dark:bg-[#0B120E] dark:text-emerald-300 dark:hover:border-emerald-400"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>MARK ALL READ ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Dedicated FRIEND REQUESTS Section */}
      <section aria-labelledby="friend-requests-heading">
        <DossierFrame
          tabLabel={`FRIEND REQUESTS · ${requests.length} PENDING`}
          tabAccent={requests.length > 0 ? 'amber' : 'green'}
        >
          <div className="flex items-center justify-between pb-3">
            <h2
              id="friend-requests-heading"
              className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-[#111915] uppercase dark:text-[#E8F5ED]"
            >
              <UserPlus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>INCOMING PEER HANDSHAKES</span>
            </h2>
          </div>

          {requests.length === 0 ? (
            <div className="border-t border-[#E1E9E4] py-6 text-center font-mono text-xs text-[#5D7266] dark:border-[#182920] dark:text-[#789684]">
              No pending friend requests. Discover more cinema & anime peers in
              EXPLORE.
            </div>
          ) : (
            <div className="divide-y divide-[#E1E9E4] border-t border-[#E1E9E4] dark:divide-[#182920] dark:border-[#182920]">
              {requests.map((req) => (
                <div
                  key={req.id}
                  data-testid={`friend-request-${req.id}`}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
                      <span className="font-bold text-emerald-800 dark:text-emerald-400">
                        {req.handle}
                      </span>
                      <span className="text-xs text-[#5D7266] dark:text-[#789684]">
                        {req.code} · REP {req.reputation} · {req.mutualCount} mutual ·{' '}
                        {req.timestamp}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#2C3E34] dark:text-[#B5CEC0]">
                      {req.note}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playConfirmBeep();
                        onAcceptRequest(req.id);
                      }}
                      aria-label={`Accept friend request from ${req.handle}`}
                      className="inline-flex min-h-[40px] items-center gap-1.5 border border-emerald-700 bg-emerald-700 px-3.5 py-1.5 font-mono text-xs font-semibold text-white transition-all hover:bg-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 active:translate-y-[1px]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>ACCEPT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playKeyTick();
                        onDeclineRequest(req.id);
                      }}
                      aria-label={`Decline friend request from ${req.handle}`}
                      className="inline-flex min-h-[40px] items-center gap-1.5 border border-red-500/40 bg-red-50 px-3.5 py-1.5 font-mono text-xs font-semibold text-red-700 transition-all hover:border-red-500 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/40 active:translate-y-[1px]"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>DECLINE</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DossierFrame>
      </section>

      {/* Activity Notifications */}
      <section aria-labelledby="notifications-heading">
        <h2
          id="notifications-heading"
          className="font-mono text-xs font-semibold tracking-wider text-[#43574B] uppercase dark:text-[#88A795]"
        >
          Recent Network Dispatches
        </h2>
        <div className="mt-3 divide-y divide-[#E1E9E4] border border-[#CDD8D1] bg-white dark:divide-[#182920] dark:border-[#1D3226] dark:bg-[#0B120E]">
          {alerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => {
                soundEngine.playKeyTick();
                onNavigateAlert(alert.targetTab, alert.targetId);
              }}
              className={`flex w-full items-start justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-[#F5F8F6] dark:hover:bg-[#101A14] ${
                alert.read ? 'opacity-75' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-[#CDD8D1] bg-[#F5F8F6] text-emerald-700 dark:border-[#244231] dark:bg-[#0F1914] dark:text-emerald-400">
                  {alert.type === 'LOBBY' ? (
                    <Radio className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#111915] dark:text-[#E8F5ED]">
                    <span>{alert.title}</span>
                    {!alert.read && (
                      <span className="font-mono text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[#43574B] dark:text-[#9BB8A7]">
                    {alert.detail}
                  </p>
                </div>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-[#5D7266] dark:text-[#789684]">
                {alert.timestamp}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
