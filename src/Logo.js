/**
 * FinkodLogo — Kalkan + bar grafik + ok + yaprak
 * uid prop: aynı sayfada birden fazla kullanımda SVG gradient ID çakışmasını önler
 */
function FinkodLogo({ size = 44, uid = 'a' }) {
  const h = Math.round(size * 1.18)
  const bg = `fkbg${uid}`
  const bgInner = `fkbgi${uid}`
  const br = `fkbr${uid}`
  const gl = `fkgl${uid}`
  const glowFilter = `fkgf${uid}`

  return (
    <svg width={size} height={h} viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Kalkan arka plan gradyanı */}
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a5060" />
          <stop offset="50%" stopColor="#0e2f42" />
          <stop offset="100%" stopColor="#071a28" />
        </linearGradient>
        {/* İç highlight gradyanı */}
        <linearGradient id={bgInner} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(13,148,136,0.18)" />
          <stop offset="100%" stopColor="rgba(13,148,136,0)" />
        </linearGradient>
        {/* Kenarlık gradyanı */}
        <linearGradient id={br} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="60%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        {/* Ok / parlama gradyanı */}
        <linearGradient id={gl} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#5eead4" />
        </linearGradient>
        {/* Glow filtresi */}
        <filter id={glowFilter} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Dış parlama halkası ── */}
      <path
        d="M22 1 C37 1 42 8 42 16 L42 30 C42 43 22 51 22 51 C22 51 2 43 2 30 L2 16 C2 8 7 1 22 1Z"
        fill="none"
        stroke="rgba(13,148,136,0.22)"
        strokeWidth="3"
      />

      {/* ── Kalkan gövdesi ── */}
      <path
        d="M22 2 C36 2 41 9 41 17 L41 30 C41 43 22 50 22 50 C22 50 3 43 3 30 L3 17 C3 9 8 2 22 2Z"
        fill={`url(#${bg})`}
        stroke={`url(#${br})`}
        strokeWidth="1.6"
      />

      {/* ── İç üst highlight (glossy) ── */}
      <path
        d="M22 5 C33 5 38 10 38 17 L38 24 C32 20 27 19 22 19 C17 19 12 20 6 24 L6 17 C6 10 11 5 22 5Z"
        fill={`url(#${bgInner})`}
      />

      {/* ── Bar chart ── */}
      {/* Bar 1 (sol, kısa) */}
      <rect x="10" y="35" width="5" height="7" rx="1.2"
        fill="#5eead4" opacity="0.65" />
      {/* Bar 2 (orta) */}
      <rect x="17" y="29" width="5" height="13" rx="1.2"
        fill="#2dd4bf" opacity="0.80" />
      {/* Bar 3 (sağ, uzun) */}
      <rect x="24" y="23" width="5" height="19" rx="1.2"
        fill="#0d9488" opacity="0.95" />

      {/* ── Yukarı ok çizgisi ── */}
      <line
        x1="12" y1="37" x2="32" y2="16"
        stroke={`url(#${gl})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        filter={`url(#${glowFilter})`}
      />
      {/* Ok başı */}
      <polyline
        points="25,14 33,14 33,22"
        stroke={`url(#${gl})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={`url(#${glowFilter})`}
      />

      {/* ── Yaprak ── */}
      <path
        d="M18 45 Q22 40 27 43 Q23 48 18 45Z"
        fill="#0d9488"
        opacity="0.90"
        filter={`url(#${glowFilter})`}
      />
      {/* Yaprak sapı */}
      <line
        x1="22" y1="45" x2="22" y2="48"
        stroke="#0d9488"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.70"
      />
    </svg>
  )
}

export default FinkodLogo
