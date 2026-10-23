/**
 * Ariana Smart — Home hero illustration
 * Responsive vector artwork; no external image required.
 */
export default function HeroArt({
  alt = "Airplane flying above the mountains at sunset",
}) {
  const stars = [
    [60, 50, 1.6],
    [150, 95, 1.1],
    [240, 35, 1.4],
    [330, 70, 1],
    [470, 40, 1.5],
    [510, 120, 1.1],
    [95, 150, 1],
    [390, 145, 1.3],
    [185, 185, 0.9],
  ];

  return (
    <svg
      className="hero-art"
      viewBox="0 0 560 460"
      role="img"
      aria-label={alt}
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ha-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#081a47" />
          <stop offset="55%" stopColor="#1639a6" />
          <stop offset="100%" stopColor="#5b86f0" />
        </linearGradient>

        <radialGradient id="ha-glow" cx="0.72" cy="0.78" r="0.55">
          <stop offset="0%" stopColor="#f2b544" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#f2b544" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#f2b544" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="ha-trail" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>

        <linearGradient id="ha-plane" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd9f4" />
        </linearGradient>

        <filter id="ha-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="7"
            floodColor="#020817"
            floodOpacity="0.4"
          />
        </filter>

        <pattern
          id="ha-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.045"
          />
        </pattern>
      </defs>

      {/* Sky */}
      <rect width="560" height="460" fill="url(#ha-sky)" />
      <rect width="560" height="460" fill="url(#ha-grid)" />
      <rect width="560" height="460" fill="url(#ha-glow)" />

      {/* Stars */}
      {stars.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" opacity="0.7" />
      ))}

      {/* Soft clouds */}
      <g fill="#ffffff" opacity="0.13">
        <path d="M18 175c0-12 10-21 22-21 7-15 29-15 36 0 15-2 25 8 25 21H18Z" />
        <path d="M375 190c0-10 8-18 18-18 6-13 25-13 31 0 13-2 22 7 22 18H375Z" />
      </g>

      {/* Flight trail */}
      <path
        d="M40 330Q170 240 300 160"
        fill="none"
        stroke="url(#ha-trail)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M70 350Q190 270 305 178"
        fill="none"
        stroke="url(#ha-trail)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Airplane — positioned to remain inside the artwork */}
      <g
        transform="translate(285 145) rotate(-22) scale(4.4)"
        fill="url(#ha-plane)"
        stroke="#dbe6ff"
        strokeWidth="0.3"
        strokeLinejoin="round"
        filter="url(#ha-shadow)"
      >
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </g>

      {/* Afghan mountain silhouettes */}
      <path
        d="M0 330 70 270 130 315 210 235 290 310 350 265 430 330 500 280 560 320V460H0Z"
        fill="#102f84"
        opacity="0.92"
      />
      <path
        d="M0 375 80 320 160 365 250 295 340 360 420 315 500 365 560 340V460H0Z"
        fill="#0a2160"
      />
      <path
        d="M0 420 90 385 190 415 300 372 410 412 500 388 560 405V460H0Z"
        fill="#061540"
      />

      {/* Warm orange horizon */}
      <path
        d="M0 435Q140 414 280 432T560 425V460H0Z"
        fill="#f2b544"
        opacity="0.12"
      />

      {/* Small project signature */}
      <rect x="28" y="432" width="3" height="17" rx="1.5" fill="#f2b544" />
      <text
        x="40"
        y="443"
        fill="#ffffff"
        fontSize="9"
        fontWeight="700"
        letterSpacing="2"
      >
        ARIANA SMART
      </text>
    </svg>
  );
}
