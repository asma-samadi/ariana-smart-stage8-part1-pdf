/** Original vector aviation illustration (no external image, so it can never fail to load). */
export default function HeroArt({ alt }) {
  return (
    <svg
      className="hero-art"
      viewBox="0 0 560 460"
      role="img"
      aria-label={alt}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="ha-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#081a47" />
          <stop offset="0.55" stopColor="#1639a6" />
          <stop offset="1" stopColor="#5b86f0" />
        </linearGradient>
        <radialGradient id="ha-glow" cx="0.72" cy="0.78" r="0.55">
          <stop offset="0" stopColor="#f2b544" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#f2b544" stopOpacity="0.18" />
          <stop offset="1" stopColor="#f2b544" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ha-trail" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <rect width="560" height="460" fill="url(#ha-sky)" />
      <rect width="560" height="460" fill="url(#ha-glow)" />
      {[
        [60, 50, 1.6],
        [150, 95, 1.1],
        [240, 35, 1.4],
        [330, 70, 1],
        [470, 40, 1.5],
        [510, 120, 1.1],
        [95, 150, 1],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity="0.7" />
      ))}
      <ellipse cx="120" cy="250" rx="90" ry="14" fill="#fff" opacity="0.12" />
      <ellipse cx="430" cy="205" rx="110" ry="16" fill="#fff" opacity="0.1" />
      <path
        d="M40 420 Q 170 330 300 250"
        fill="none"
        stroke="url(#ha-trail)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M70 430 Q 190 350 305 268"
        fill="none"
        stroke="url(#ha-trail)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <g
        transform="translate(250 90) scale(7.4)"
        fill="#ffffff"
        stroke="#dbe6ff"
        strokeWidth="0.35"
        strokeLinejoin="round"
      >
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </g>
      <path
        d="M0 330 L70 270 L130 315 L210 235 L290 310 L350 265 L430 330 L500 280 L560 320 V460 H0Z"
        fill="#102f84"
        opacity="0.9"
      />
      <path
        d="M0 375 L80 320 L160 365 L250 295 L340 360 L420 315 L500 365 L560 340 V460 H0Z"
        fill="#0a2160"
      />
      <path
        d="M0 420 L90 385 L190 415 L300 372 L410 412 L500 388 L560 405 V460 H0Z"
        fill="#061540"
      />
    </svg>
  );
}
