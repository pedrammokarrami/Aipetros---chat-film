import { useState } from 'react';
import { Award, Check, Edit3, ShieldCheck, X } from 'lucide-react';
import type { AgentProfile, DossierPost } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface ProfileModalProps {
  open: boolean;
  profile: AgentProfile;
  reputation: number;
  friendsCount: number;
  userPosts: DossierPost[];
  onUpdateBio: (bio: string) => void;
  onClose: () => void;
}

export function ProfileModal({
  open,
  profile,
  reputation,
  friendsCount,
  userPosts,
  onUpdateBio,
  onClose,
}: ProfileModalProps) {
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(profile.bio);

  if (!open) return null;

  const handleSaveBio = () => {
    soundEngine.playConfirmBeep();
    onUpdateBio(bioDraft.trim() || profile.bio);
    setEditingBio(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="animate-modal-pop max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-[#CDD8D1] bg-white shadow-2xl dark:border-emerald-500/45 dark:bg-[#0B120E]"
      >
        <div className="flex items-center justify-between border-b border-[#CDD8D1] bg-[#F5F8F6] px-5 py-3.5 dark:border-[#1C2E24] dark:bg-[#0F1914]">
          <h2
            id="profile-modal-title"
            className="flex items-center gap-2 font-mono text-sm font-bold text-emerald-800 dark:text-emerald-400"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>AGENT DOSSIER // {profile.handle}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close agent profile"
            className="p-1 text-[#5D7266] hover:text-[#111915] dark:text-[#88A795] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Identity & Peer Reputation */}
          <div className="flex flex-col gap-4 border-b border-[#E1E9E4] pb-5 dark:border-[#182920] sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-mono text-xl font-bold text-[#111915] dark:text-[#E8F5ED]">
                {profile.handle}
              </div>
              <div className="mt-0.5 font-mono text-xs text-[#5D7266] dark:text-[#789684]">
                ID: {profile.code} · ENLISTED {profile.joinedDate} ·{' '}
                {profile.referralsCount} VERIFIED REFERRALS
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
                {profile.verifiedBadges.map((badge) => (
                  <span key={badge} className="inline-flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" />
                    <span>{badge}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="shrink-0 border border-emerald-600/40 bg-emerald-50 px-4 py-3 text-left dark:bg-emerald-950/30 sm:text-right">
              <div className="font-mono text-[10px] font-semibold tracking-wider text-emerald-800 dark:text-emerald-400">
                PEER REPUTATION
              </div>
              <div className="mt-0.5 font-mono text-2xl font-bold text-[#111915] dark:text-emerald-300">
                {reputation}
              </div>
              <div className="font-mono text-[10px] text-[#5D7266] dark:text-[#7FA08C]">
                +25 PER REFERRAL
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-[#5D7266] dark:text-[#789684]">
                FIELD BIO
              </span>
              {!editingBio && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playKeyTick();
                    setBioDraft(profile.bio);
                    setEditingBio(true);
                  }}
                  className="inline-flex items-center gap-1 font-mono text-xs text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>EDIT BIO</span>
                </button>
              )}
            </div>

            {editingBio ? (
              <div className="mt-2 space-y-2">
                <textarea
                  rows={3}
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  aria-label="Edit agent bio"
                  className="w-full border border-[#CDD8D1] bg-[#F8FAF8] p-2.5 text-sm text-[#111915] focus:border-emerald-600 focus:outline-none dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBio(false)}
                    className="border border-[#CDD8D1] px-3 py-1 font-mono text-xs dark:border-[#244231]"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBio}
                    className="inline-flex items-center gap-1 border border-emerald-700 bg-emerald-700 px-3 py-1 font-mono text-xs font-semibold text-white dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>SAVE BIO</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-sm leading-relaxed text-[#2C3E34] dark:text-[#B5CEC0]">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Stats Strip */}
          <div className="grid grid-cols-3 divide-x divide-[#E1E9E4] border border-[#E1E9E4] bg-[#F8FAF8] dark:divide-[#182920] dark:border-[#182920] dark:bg-[#0F1914]">
            <div className="p-3 text-center">
              <div className="font-mono text-lg font-bold text-[#111915] dark:text-[#E8F5ED]">
                {userPosts.length}
              </div>
              <div className="font-mono text-[10px] text-[#5D7266] dark:text-[#789684]">
                DOSSIERS FILED
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="font-mono text-lg font-bold text-[#111915] dark:text-[#E8F5ED]">
                {friendsCount}
              </div>
              <div className="font-mono text-[10px] text-[#5D7266] dark:text-[#789684]">
                P2P FRIENDS
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="font-mono text-lg font-bold text-[#111915] dark:text-[#E8F5ED]">
                {profile.watchHours}h
              </div>
              <div className="font-mono text-[10px] text-[#5D7266] dark:text-[#789684]">
                SYNC WATCH TIME
              </div>
            </div>
          </div>

          {/* Recent User Posts */}
          <div>
            <div className="font-mono text-xs font-semibold text-[#5D7266] dark:text-[#789684]">
              RECENT FILED DOSSIERS
            </div>
            {userPosts.length === 0 ? (
              <div className="mt-2 border border-dashed border-[#CDD8D1] p-4 font-mono text-xs text-[#5D7266] dark:border-[#244231] dark:text-[#789684]">
                You haven’t published a public dossier yet. Use + NEW DOSSIER on
                the FEED tab to file your first breakdown (+15 Peer Reputation).
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {userPosts.map((post) => (
                  <div
                    key={post.id}
                    className="border border-[#E1E9E4] bg-[#F8FAF8] px-3.5 py-2.5 dark:border-[#1B2E23] dark:bg-[#0F1914]"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                      <span>
                        {post.fileCode} · {post.category}
                      </span>
                      <span>{post.upvotes} upvotes</span>
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-bold text-[#111915] dark:text-[#E8F5ED]">
                      {post.title}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
