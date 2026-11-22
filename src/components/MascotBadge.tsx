interface MascotBadgeProps {
  size?: 'sm' | 'lg';
}

export default function MascotBadge({ size = 'sm' }: MascotBadgeProps) {
  const dim = size === 'lg' ? 'h-16 w-16' : 'h-8 w-8';

  return (
    <span
      className={`inline-flex ${dim} shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#F6BE6B] bg-[#FFF8EE] shadow-xs`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" fill="none">
        {/* Warm radial cream background */}
        <circle cx="32" cy="32" r="32" fill="#FFF4E0" />
        {/* Tiny decorative stars/sparkles */}
        <circle cx="13" cy="20" r="2" fill="#F6BE6B" />
        <circle cx="51" cy="18" r="1.8" fill="#D96F4E" />

        {/* Cute body */}
        <rect x="19" y="34" width="26" height="22" rx="11" fill="#D98A4E" />
        <ellipse cx="32" cy="45" rx="8.5" ry="7.5" fill="#FFF8EE" />

        {/* Explorer / detective hat */}
        <path
          d="M14 27C14 25 22 23 32 23C42 23 50 25 50 27C50 28.5 42 30 32 30C22 30 14 28.5 14 27Z"
          fill="#6E4E3E"
        />
        <path
          d="M21 25L23.5 14.5C24 12.8 26 12 28.5 13L32 14.2L35.5 13C38 12 40 12.8 40.5 14.5L43 25H21Z"
          fill="#7D5A48"
        />
        <path d="M21.5 23.5H42.5V26H21.5V23.5Z" fill="#D96F4E" />

        {/* Face & eyes */}
        <circle cx="26.5" cy="34.5" r="2" fill="#3B312C" />
        <circle cx="37.5" cy="34.5" r="2" fill="#3B312C" />
        <circle cx="25.8" cy="33.8" r="0.7" fill="#FFF8EE" />
        <circle cx="36.8" cy="33.8" r="0.7" fill="#FFF8EE" />
        {/* Cheeks */}
        <ellipse cx="22.5" cy="37" rx="2.4" ry="1.4" fill="#E88B72" opacity="0.7" />
        <ellipse cx="41.5" cy="37" rx="2.4" ry="1.4" fill="#E88B72" opacity="0.7" />
        {/* Cute beak/nose */}
        <path d="M30 36.5H34L32 39.5L30 36.5Z" fill="#F4A842" />

        {/* Mini magnifying lens / gauge badge */}
        <circle cx="47" cy="44" r="5" fill="#F6BE6B" stroke="#4A3F3A" strokeWidth="2" />
        <line x1="50.5" y1="47.5" x2="54.5" y2="51.5" stroke="#4A3F3A" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
