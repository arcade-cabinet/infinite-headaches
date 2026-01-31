/**
 * Pause Button Component
 * Button to pause the game
 */

interface PauseButtonProps {
  onClick: () => void;
  className?: string;
}

export function PauseButton({ onClick, className = "" }: PauseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        pointer-events-auto
        w-12 h-12 
        rounded-full 
        bg-purple-900/80 
        border-2 border-purple-400/50
        flex items-center justify-center
        transition-all duration-200
        hover:bg-purple-800/80 hover:scale-110
        active:scale-95
        shadow-lg
        ${className}
      `}
      aria-label="Pause game"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="text-purple-200"
      >
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </svg>
    </button>
  );
}
