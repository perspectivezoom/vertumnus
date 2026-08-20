import type { ReactNode } from 'react';

/**
 * The floating controls' one button shape.
 *
 * Every control that sits over the poster is the same circle, whether it opens the panel,
 * dismisses it or prints — they are peers, so they should not be three different sizes.
 */
export function RoundButton({
  onClick,
  label,
  tone = 'light',
  children,
}: {
  onClick: () => void;
  label: string;
  tone?: 'light' | 'green';
  children: ReactNode;
}) {
  const palette =
    tone === 'green'
      ? 'bg-green-700 text-white hover:brightness-90'
      : 'border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-[filter,color] duration-150 ${palette}`}
    >
      {children}
    </button>
  );
}
