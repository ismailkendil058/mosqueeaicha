export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`} aria-hidden="true">
      <svg
        width="240"
        height="18"
        viewBox="0 0 240 18"
        fill="none"
        className="text-primary"
      >
        <path
          d="M0 9h84"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeOpacity="0.5"
        />
        <path
          d="M156 9h84"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeOpacity="0.5"
        />
        <path
          d="M120 1l5.6 5.6h7.9v7.9L120 17l-13.5-2.5V6.6h7.9L120 1z"
          stroke="currentColor"
          strokeWidth="0.9"
        />
        <path d="M96 9l8-5v10l-8-5zM144 9l-8-5v10l8-5z" stroke="currentColor" strokeWidth="0.9" />
      </svg>
    </div>
  );
}

export function Crescent({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M22 4a12 12 0 100 24 14 14 0 110-24z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M27 6l1.2 3 3 1.2-3 1.2L27 14.4l-1.2-3-3-1.2 3-1.2L27 6z" fill="currentColor" />
    </svg>
  );
}
