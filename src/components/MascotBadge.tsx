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
      <img
        src="./assets/hachi-app-icon-512.png"
        alt=""
        className="h-full w-full object-cover"
        draggable={false}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = './assets/hachi-app-icon-192.png';
        }}
      />
    </span>
  );
}
