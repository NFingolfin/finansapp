/** Finkod Cüzdan — cube + currency mark */
function FinkodLogo({ size = 44, uid = 'a' }) {
  const h = Math.round(size * 0.96)
  const top = `cubeTop-${uid}`
  const left = `cubeLeft-${uid}`
  const right = `cubeRight-${uid}`

  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 64 61"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Finkod Cüzdan"
    >
      <defs>
        <linearGradient id={top} x1="14" y1="10" x2="48" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#173653" />
          <stop offset="1" stopColor="#0B2038" />
        </linearGradient>
        <linearGradient id={left} x1="11" y1="23" x2="31" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#153A5D" />
          <stop offset="1" stopColor="#071C34" />
        </linearGradient>
        <linearGradient id={right} x1="31" y1="29" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#36516B" />
          <stop offset="1" stopColor="#1B324B" />
        </linearGradient>
      </defs>

      <path d="M10 20.2 29.8 8.5 49.8 19.8 30 31.8 10 20.2Z" fill={`url(#${top})`} />
      <path d="M10 23.7 28.2 34.2V56L10 45.4V23.7Z" fill={`url(#${left})`} />
      <path d="M31.8 34.2 48.1 24.4V45.6L31.8 55.8V34.2Z" fill={`url(#${right})`} />
      <path d="M10 34.5 28.2 45" stroke="#31506E" strokeWidth="1" opacity=".55" />
      <path d="M31.8 45 48.1 35.1" stroke="#597087" strokeWidth="1" opacity=".38" />

      <path
        d="M56.5 24.8a13.8 13.8 0 1 0 0 20.4"
        stroke="#7C8793"
        strokeWidth="4.2"
        strokeLinecap="square"
      />
      <path d="M45.8 17.5v7.4M45.8 45.1v7.4" stroke="#7C8793" strokeWidth="4.2" />
    </svg>
  )
}

export default FinkodLogo
