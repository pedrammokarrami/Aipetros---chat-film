import type { ReactNode } from 'react';

interface DossierFrameProps {
  children: ReactNode;
  tabLabel?: string;
  tabAccent?: 'green' | 'amber' | 'crimson';
  className?: string;
  bodyClassName?: string;
}

export function DossierFrame({
  children,
  tabLabel,
  tabAccent = 'green',
  className = '',
  bodyClassName = 'p-4 sm:p-5',
}: DossierFrameProps) {
  const accentText =
    tabAccent === 'crimson'
      ? 'text-red-700 dark:text-red-400 border-red-500/40'
      : tabAccent === 'amber'
        ? 'text-amber-700 dark:text-amber-400 border-amber-500/40'
        : 'text-emerald-800 dark:text-emerald-400 border-emerald-600/35 dark:border-emerald-500/35';

  return (
    <div className={`group/dossier relative ${className}`}>
      {tabLabel && (
        <div className="flex items-end">
          <div
            className={`inline-flex items-center border-t border-l border-r bg-white dark:bg-[#0D1611] px-3 py-1 font-mono text-[11px] font-semibold tracking-wider uppercase transition-colors ${accentText}`}
          >
            {tabLabel}
          </div>
        </div>
      )}
      <div
        className={`panel-sheen relative border border-[#CDD8D1] dark:border-[#1E3528] bg-white dark:bg-[#0B120E] transition-[border-color,background-color] duration-150 hover:border-[#9AB5A4] dark:hover:border-[#2C543D] ${bodyClassName}`}
      >
        {/* Crisp dossier corner brackets */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-px -left-px h-2.5 w-2.5 border-t-2 border-l-2 border-emerald-700/75 transition-colors duration-150 group-hover/dossier:border-emerald-500 dark:border-emerald-500/75 dark:group-hover/dossier:border-emerald-300"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-px -right-px h-2.5 w-2.5 border-t-2 border-r-2 border-emerald-700/75 transition-colors duration-150 group-hover/dossier:border-emerald-500 dark:border-emerald-500/75 dark:group-hover/dossier:border-emerald-300"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px -left-px h-2.5 w-2.5 border-b-2 border-l-2 border-emerald-700/75 transition-colors duration-150 group-hover/dossier:border-emerald-500 dark:border-emerald-500/75 dark:group-hover/dossier:border-emerald-300"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px -right-px h-2.5 w-2.5 border-b-2 border-r-2 border-emerald-700/75 transition-colors duration-150 group-hover/dossier:border-emerald-500 dark:border-emerald-500/75 dark:group-hover/dossier:border-emerald-300"
        />
        {children}
      </div>
    </div>
  );
}
