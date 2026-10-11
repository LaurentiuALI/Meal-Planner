/** Iconița aplicației (bol cu abur), desenată pentru ImageResponse: doar stiluri inline. */
export function AppIcon({ size }: { size: number }) {
  const s = size / 100;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#16a34a" }}>
      <svg width={70 * s} height={70 * s} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h20" />
        <path d="M20 12v1a8 8 0 0 1-16 0v-1" />
        <path d="M8 21h8" />
        <path d="M9 3c-1 1.5 1 2.5 0 4" />
        <path d="M12 3c-1 1.5 1 2.5 0 4" />
        <path d="M15 3c-1 1.5 1 2.5 0 4" />
      </svg>
    </div>
  );
}
