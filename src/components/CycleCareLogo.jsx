export function CycleCareLogo({ size = 42, showWordmark = false, className = "", decorative = false }) {
  return (
    <span className={`cyclecare-logo ${className}`.trim()} style={{ "--cyclecare-logo-size": `${size}px` }}>
      <span className="cyclecare-logo-mark" aria-hidden={decorative ? "true" : undefined} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : "CycleCare"}>
        <img src="/cyclecare-logo-mark.png" alt="" />
      </span>
      {showWordmark && <span className="cyclecare-logo-wordmark">CycleCare</span>}
    </span>
  );
}
