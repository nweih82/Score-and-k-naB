import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function BankAndScoreLogo({ className = '', size = 'md' }: LogoProps) {
  return <BankAndScoreHorizontalLogo className={className} size={size} />;
}

export function BankAndScoreHorizontalLogo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24',
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 380 110"
        className="w-auto h-full drop-shadow-md overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="blackDieHoriz" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="redDieHoriz" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>
          <linearGradient id="greenDieHoriz" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>
          <linearGradient id="scoreTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#86EFAC" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
          <filter id="hShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="4" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* LEFT THREE 3D DICE (B, D, S) */}
        <g filter="url(#hShadow)">
          {/* Black Die 'B' */}
          <g transform="translate(15, 20) rotate(-12) scale(0.85)">
            <rect x="0" y="0" width="48" height="48" rx="12" fill="url(#blackDieHoriz)" stroke="#000000" strokeWidth="3" />
            <text x="14" y="36" fill="#FFFFFF" fontFamily="system-ui, -apple-system, 'Arial Black'" fontWeight="900" fontSize="30">
              B
            </text>
          </g>

          {/* Red Die 'D' */}
          <g transform="translate(50, 10) rotate(10) scale(0.88)">
            <rect x="0" y="0" width="50" height="50" rx="12" fill="url(#redDieHoriz)" stroke="#7F1D1D" strokeWidth="3" />
            <text x="14" y="37" fill="#FFFFFF" fontFamily="system-ui, -apple-system, 'Arial Black'" fontWeight="900" fontSize="32">
              D
            </text>
            {/* Dots on right edge */}
            <circle cx="42" cy="15" r="2.5" fill="#FFFFFF" />
            <circle cx="42" cy="25" r="2.5" fill="#FFFFFF" />
            <circle cx="42" cy="35" r="2.5" fill="#FFFFFF" />
          </g>

          {/* Green Die 'S' */}
          <g transform="translate(25, 45) rotate(-6) scale(0.92)">
            <rect x="0" y="0" width="52" height="52" rx="13" fill="url(#greenDieHoriz)" stroke="#14532D" strokeWidth="3" />
            <text x="15" y="39" fill="#FFFFFF" fontFamily="system-ui, -apple-system, 'Arial Black'" fontWeight="900" fontSize="34">
              S
            </text>
            {/* Dots on bottom */}
            <circle cx="18" cy="44" r="2.5" fill="#FFFFFF" />
            <circle cx="34" cy="44" r="2.5" fill="#FFFFFF" />
          </g>
        </g>

        {/* RIGHT WORDMARK: "Bank & SCORE!" */}
        <g filter="url(#hShadow)" transform="translate(120, 0)">
          {/* Black Outer Contour Block for Bank & SCORE! */}
          <text
            x="12"
            y="52"
            fill="#0F172A"
            stroke="#020617"
            strokeWidth="16"
            strokeLinejoin="round"
            fontFamily="system-ui, -apple-system, 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="46"
          >
            Bank
          </text>
          
          <text
            x="110"
            y="52"
            fill="#0F172A"
            stroke="#020617"
            strokeWidth="16"
            strokeLinejoin="round"
            fontFamily="system-ui, -apple-system, 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="40"
          >
            &amp;
          </text>

          <text
            x="10"
            y="98"
            fill="#0F172A"
            stroke="#020617"
            strokeWidth="18"
            strokeLinejoin="round"
            fontFamily="system-ui, -apple-system, 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="52"
          >
            SCORE!
          </text>

          {/* Inner Colored Text Fill */}
          {/* White "Bank" */}
          <text
            x="12"
            y="52"
            fill="#FFFFFF"
            fontFamily="system-ui, -apple-system, 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="46"
          >
            Bank
          </text>

          {/* Red "&" */}
          <text
            x="110"
            y="52"
            fill="#EF4444"
            fontFamily="system-ui, -apple-system, 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="40"
          >
            &amp;
          </text>

          {/* Lime Green "SCORE!" */}
          <text
            x="10"
            y="98"
            fill="url(#scoreTextGrad)"
            fontFamily="system-ui, -apple-system, 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="52"
          >
            SCORE!
          </text>
        </g>
      </svg>
    </div>
  );
}

export function FarkleLogo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-10',
    md: 'h-16',
    lg: 'h-24',
    xl: 'h-32',
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 320 140"
        className="w-auto h-full drop-shadow-md overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="farkleTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="85%" stopColor="#F0F4FF" />
            <stop offset="100%" stopColor="#D9E2FF" />
          </linearGradient>
          <linearGradient id="diceGradOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFAA00" />
            <stop offset="50%" stopColor="#FF7700" />
            <stop offset="100%" stopColor="#CC4400" />
          </linearGradient>
          <filter id="shadowFarkle" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="3" dy="5" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Bottom-left floating 3D Die 1 */}
        <g transform="translate(18, 55) rotate(-18) scale(0.72)">
          <rect x="0" y="0" width="42" height="42" rx="8" fill="url(#diceGradOrange)" stroke="#992B00" strokeWidth="2.5" />
          {/* Dice dots (5) */}
          <circle cx="11" cy="11" r="3.5" fill="#FFFFFF" />
          <circle cx="31" cy="11" r="3.5" fill="#FFFFFF" />
          <circle cx="21" cy="21" r="3.5" fill="#FFFFFF" />
          <circle cx="11" cy="31" r="3.5" fill="#FFFFFF" />
          <circle cx="31" cy="31" r="3.5" fill="#FFFFFF" />
        </g>

        {/* Bottom-left floating 3D Die 2 (Main front) */}
        <g transform="translate(32, 70) rotate(12) scale(0.85)">
          <rect x="0" y="0" width="48" height="48" rx="9" fill="url(#diceGradOrange)" stroke="#802400" strokeWidth="3" />
          {/* Dice dots (6) */}
          <circle cx="13" cy="11" r="4" fill="#FFFFFF" />
          <circle cx="13" cy="24" r="4" fill="#FFFFFF" />
          <circle cx="13" cy="37" r="4" fill="#FFFFFF" />
          <circle cx="35" cy="11" r="4" fill="#FFFFFF" />
          <circle cx="35" cy="24" r="4" fill="#FFFFFF" />
          <circle cx="35" cy="37" r="4" fill="#FFFFFF" />
        </g>

        {/* Top-right floating 3D Die */}
        <g transform="translate(248, 32) rotate(22) scale(0.78)">
          <rect x="0" y="0" width="44" height="44" rx="8" fill="url(#diceGradOrange)" stroke="#992B00" strokeWidth="2.5" />
          {/* Dice dots (4) */}
          <circle cx="12" cy="12" r="3.8" fill="#FFFFFF" />
          <circle cx="32" cy="12" r="3.8" fill="#FFFFFF" />
          <circle cx="12" cy="32" r="3.8" fill="#FFFFFF" />
          <circle cx="32" cy="32" r="3.8" fill="#FFFFFF" />
        </g>

        {/* Main "Farkle" 3D Outline Wordmark */}
        <g filter="url(#shadowFarkle)">
          {/* Deep dark blue 3D shadow outline */}
          <text
            x="152"
            y="87"
            textAnchor="middle"
            fill="#1E293B"
            stroke="#0F172A"
            strokeWidth="22"
            strokeLinejoin="round"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Fredoka', 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="78"
            letterSpacing="-1px"
          >
            Farkle
          </text>
          {/* Vibrant Blue main outline */}
          <text
            x="150"
            y="84"
            textAnchor="middle"
            fill="#1E3A8A"
            stroke="#1D4ED8"
            strokeWidth="16"
            strokeLinejoin="round"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Fredoka', 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="78"
            letterSpacing="-1px"
          >
            Farkle
          </text>
          {/* White inner text fill */}
          <text
            x="150"
            y="84"
            textAnchor="middle"
            fill="url(#farkleTextGrad)"
            stroke="#1E3A8A"
            strokeWidth="4"
            strokeLinejoin="round"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Fredoka', 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="78"
            letterSpacing="-1px"
          >
            Farkle
          </text>
        </g>

        {/* TM superscript mark */}
        <text
          x="262"
          y="68"
          fill="#1E3A8A"
          fontSize="11"
          fontWeight="900"
          fontFamily="sans-serif"
        >
          TM
        </text>
      </svg>
    </div>
  );
}

export function YahtzeeLogo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-10',
    md: 'h-16',
    lg: 'h-24',
    xl: 'h-32',
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 320 120"
        className="w-auto h-full drop-shadow-md overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="shadowYahtzee" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Tilted & Arched "Yahtzee" text group matching exact official red/black double outline style */}
        <g transform="rotate(-7, 160, 60)" filter="url(#shadowYahtzee)">
          {/* Outer Red Outline */}
          <text
            x="160"
            y="78"
            textAnchor="middle"
            fill="#DC2626"
            stroke="#DC2626"
            strokeWidth="20"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Trebuchet MS', sans-serif"
            fontSize="72"
            letterSpacing="1px"
          >
            Yahtzee
          </text>

          {/* Middle Black Stroke */}
          <text
            x="160"
            y="78"
            textAnchor="middle"
            fill="#000000"
            stroke="#000000"
            strokeWidth="11"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Trebuchet MS', sans-serif"
            fontSize="72"
            letterSpacing="1px"
          >
            Yahtzee
          </text>

          {/* Inner White Lettering */}
          <text
            x="160"
            y="78"
            textAnchor="middle"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Trebuchet MS', sans-serif"
            fontSize="72"
            letterSpacing="1px"
          >
            Yahtzee
          </text>
        </g>
      </svg>
    </div>
  );
}

export function DominoesLogo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-10',
    md: 'h-16',
    lg: 'h-24',
    xl: 'h-32',
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 380 185"
        className="w-auto h-full drop-shadow-lg overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle cyan glow behind tiles */}
          <filter id="dominoCyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="tileDropShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.35" />
          </filter>

          <linearGradient id="dominoWhiteTile" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          <radialGradient id="pipGloss" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="40%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
        </defs>

        {/* Ambient background glow for tiles */}
        <ellipse cx="190" cy="80" rx="110" ry="60" fill="#38BDF8" opacity="0.2" filter="blur(12px)" />

        {/* THREE FANNED DOMINO TILES */}
        <g filter="url(#tileDropShadow)">
          {/* TILE 1: LEFT TILE (Tilted Left ~12 deg) - 4 / 2 */}
          <g transform="translate(102, 12) rotate(-13)">
            {/* Tile Base */}
            <rect x="0" y="0" width="62" height="114" rx="10" fill="url(#dominoWhiteTile)" stroke="#CBD5E1" strokeWidth="2.5" />
            <rect x="1" y="1" width="60" height="112" rx="9" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
            {/* Divider Line */}
            <line x1="8" y1="57" x2="54" y2="57" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
            
            {/* Top 4 Pips */}
            <g fill="url(#pipGloss)">
              <circle cx="21" cy="21" r="5" />
              <circle cx="41" cy="21" r="5" />
              <circle cx="21" cy="41" r="5" />
              <circle cx="41" cy="41" r="5" />
            </g>
            {/* Glare dots for top pips */}
            <g fill="#FFFFFF" opacity="0.9">
              <circle cx="19.5" cy="19.5" r="1.3" />
              <circle cx="39.5" cy="19.5" r="1.3" />
              <circle cx="19.5" cy="39.5" r="1.3" />
              <circle cx="39.5" cy="39.5" r="1.3" />
            </g>

            {/* Bottom 2 Pips */}
            <g fill="url(#pipGloss)">
              <circle cx="21" cy="75" r="5" />
              <circle cx="41" cy="95" r="5" />
            </g>
            <g fill="#FFFFFF" opacity="0.9">
              <circle cx="19.5" cy="73.5" r="1.3" />
              <circle cx="39.5" cy="93.5" r="1.3" />
            </g>
          </g>

          {/* TILE 2: CENTER TILE (Vertical) - 5 / 3 */}
          <g transform="translate(159, 6)">
            {/* Tile Base */}
            <rect x="0" y="0" width="62" height="114" rx="10" fill="url(#dominoWhiteTile)" stroke="#CBD5E1" strokeWidth="2.5" />
            <rect x="1" y="1" width="60" height="112" rx="9" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
            {/* Divider Line */}
            <line x1="8" y1="57" x2="54" y2="57" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />

            {/* Top 5 Pips */}
            <g fill="url(#pipGloss)">
              <circle cx="21" cy="21" r="5" />
              <circle cx="41" cy="21" r="5" />
              <circle cx="31" cy="31" r="5" />
              <circle cx="21" cy="41" r="5" />
              <circle cx="41" cy="41" r="5" />
            </g>
            <g fill="#FFFFFF" opacity="0.9">
              <circle cx="19.5" cy="19.5" r="1.3" />
              <circle cx="39.5" cy="19.5" r="1.3" />
              <circle cx="29.5" cy="29.5" r="1.3" />
              <circle cx="19.5" cy="39.5" r="1.3" />
              <circle cx="39.5" cy="39.5" r="1.3" />
            </g>

            {/* Bottom 3 Pips */}
            <g fill="url(#pipGloss)">
              <circle cx="21" cy="73" r="5" />
              <circle cx="31" cy="85" r="5" />
              <circle cx="41" cy="97" r="5" />
            </g>
            <g fill="#FFFFFF" opacity="0.9">
              <circle cx="19.5" cy="71.5" r="1.3" />
              <circle cx="29.5" cy="83.5" r="1.3" />
              <circle cx="39.5" cy="95.5" r="1.3" />
            </g>
          </g>

          {/* TILE 3: RIGHT TILE (Tilted Right ~14 deg) - 1 / 6 */}
          <g transform="translate(216, 15) rotate(15)">
            {/* Tile Base */}
            <rect x="0" y="0" width="62" height="114" rx="10" fill="url(#dominoWhiteTile)" stroke="#CBD5E1" strokeWidth="2.5" />
            <rect x="1" y="1" width="60" height="112" rx="9" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
            {/* Divider Line */}
            <line x1="8" y1="57" x2="54" y2="57" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />

            {/* Top 1 Pip */}
            <g fill="url(#pipGloss)">
              <circle cx="31" cy="31" r="5" />
            </g>
            <g fill="#FFFFFF" opacity="0.9">
              <circle cx="29.5" cy="29.5" r="1.3" />
            </g>

            {/* Bottom 6 Pips */}
            <g fill="url(#pipGloss)">
              <circle cx="21" cy="71" r="5" />
              <circle cx="21" cy="85" r="5" />
              <circle cx="21" cy="99" r="5" />
              <circle cx="41" cy="71" r="5" />
              <circle cx="41" cy="85" r="5" />
              <circle cx="41" cy="99" r="5" />
            </g>
            <g fill="#FFFFFF" opacity="0.9">
              <circle cx="19.5" cy="69.5" r="1.3" />
              <circle cx="19.5" cy="83.5" r="1.3" />
              <circle cx="19.5" cy="97.5" r="1.3" />
              <circle cx="39.5" cy="69.5" r="1.3" />
              <circle cx="39.5" cy="83.5" r="1.3" />
              <circle cx="39.5" cy="97.5" r="1.3" />
            </g>
          </g>
        </g>

        {/* 3D TYPOGRAPHY "DOMINOES" OVERLAPPING AT BOTTOM */}
        <g>
          {/* Black shadow layer */}
          <text
            x="190"
            y="166"
            textAnchor="middle"
            fill="#020617"
            stroke="#020617"
            strokeWidth="16"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="64"
            letterSpacing="-0.5px"
          >
            DOMINOES
          </text>

          {/* Deep cobalt blue 3D bottom extrusion */}
          <text
            x="190"
            y="163"
            textAnchor="middle"
            fill="#1E3A8A"
            stroke="#1E3A8A"
            strokeWidth="15"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="64"
            letterSpacing="-0.5px"
          >
            DOMINOES
          </text>

          {/* Royal blue mid 3D bevel */}
          <text
            x="190"
            y="160"
            textAnchor="middle"
            fill="#1D4ED8"
            stroke="#1D4ED8"
            strokeWidth="13"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="64"
            letterSpacing="-0.5px"
          >
            DOMINOES
          </text>

          {/* Vivid cyan outline */}
          <text
            x="190"
            y="157"
            textAnchor="middle"
            fill="#00B2FF"
            stroke="#00B2FF"
            strokeWidth="8"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="64"
            letterSpacing="-0.5px"
          >
            DOMINOES
          </text>

          {/* Bright sky blue inner border */}
          <text
            x="190"
            y="157"
            textAnchor="middle"
            fill="#38BDF8"
            stroke="#38BDF8"
            strokeWidth="4"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="64"
            letterSpacing="-0.5px"
          >
            DOMINOES
          </text>

          {/* Pure White Front Face */}
          <text
            x="190"
            y="157"
            textAnchor="middle"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="1"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="64"
            letterSpacing="-0.5px"
          >
            DOMINOES
          </text>
        </g>
      </svg>
    </div>
  );
}

export function SpadesLogo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-10',
    md: 'h-16',
    lg: 'h-24',
    xl: 'h-32',
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 360 175"
        className="w-auto h-full drop-shadow-lg overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="spadesCardShadow" x="-15%" y="-15%" width="135%" height="135%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#020617" floodOpacity="0.4" />
          </filter>
          <linearGradient id="spadeCardFace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <linearGradient id="spadeGoldTrim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="spadeSuitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="50%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>

        {/* Ambient indigo/violet glow */}
        <ellipse cx="180" cy="78" rx="115" ry="56" fill="#6366F1" opacity="0.22" filter="blur(12px)" />

        {/* FANNED PLAYING CARDS */}
        <g filter="url(#spadesCardShadow)">
          {/* Left Card: High Joker */}
          <g transform="translate(96, 14) rotate(-14)">
            <rect x="0" y="0" width="66" height="96" rx="8" fill="url(#spadeCardFace)" stroke="#CBD5E1" strokeWidth="2" />
            <rect x="4" y="4" width="58" height="88" rx="5" fill="none" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 2" />
            <text x="9" y="18" fill="#D97706" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="11">★</text>
            <text x="9" y="28" fill="#7C3AED" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8">JOKER</text>
            <circle cx="33" cy="52" r="14" fill="#F59E0B" opacity="0.15" />
            <text x="33" y="59" textAnchor="middle" fill="#7C3AED" fontSize="24">🃏</text>
          </g>

          {/* Center Card: Ace of Spades */}
          <g transform="translate(147, 5)">
            <rect x="0" y="0" width="68" height="98" rx="9" fill="url(#spadeCardFace)" stroke="url(#spadeGoldTrim)" strokeWidth="2.5" />
            <text x="10" y="21" fill="#0F172A" fontFamily="system-ui, 'Arial Black', sans-serif" fontWeight="900" fontSize="15">A</text>
            <text x="10" y="34" fill="#0F172A" fontSize="13">♠</text>
            {/* Large ornate center Spade */}
            <text x="34" y="66" textAnchor="middle" fill="url(#spadeSuitGrad)" fontSize="42">♠</text>
            <text x="58" y="90" textAnchor="end" fill="#0F172A" fontFamily="system-ui, 'Arial Black', sans-serif" fontWeight="900" fontSize="12">A</text>
          </g>

          {/* Right Card: 2 of Spades / King of Spades */}
          <g transform="translate(200, 15) rotate(14)">
            <rect x="0" y="0" width="66" height="96" rx="8" fill="url(#spadeCardFace)" stroke="#CBD5E1" strokeWidth="2" />
            <text x="9" y="20" fill="#0F172A" fontFamily="system-ui, 'Arial Black', sans-serif" fontWeight="900" fontSize="14">2</text>
            <text x="9" y="32" fill="#0F172A" fontSize="12">♠</text>
            <text x="33" y="60" textAnchor="middle" fill="#1E293B" fontSize="30">♠</text>
          </g>
        </g>

        {/* 3D WORDMARK "SPADES" */}
        <g>
          <text
            x="180"
            y="156"
            textAnchor="middle"
            fill="#020617"
            stroke="#020617"
            strokeWidth="16"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="62"
            letterSpacing="1px"
          >
            SPADES
          </text>
          <text
            x="180"
            y="152"
            textAnchor="middle"
            fill="#312E81"
            stroke="#312E81"
            strokeWidth="13"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="62"
            letterSpacing="1px"
          >
            SPADES
          </text>
          <text
            x="180"
            y="149"
            textAnchor="middle"
            fill="#6366F1"
            stroke="#6366F1"
            strokeWidth="7"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="62"
            letterSpacing="1px"
          >
            SPADES
          </text>
          <text
            x="180"
            y="149"
            textAnchor="middle"
            fill="#FFFFFF"
            stroke="#E0E7FF"
            strokeWidth="1.5"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="62"
            letterSpacing="1px"
          >
            SPADES
          </text>
        </g>
      </svg>
    </div>
  );
}

export function EuchreLogo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-10',
    md: 'h-16',
    lg: 'h-24',
    xl: 'h-32',
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 360 175"
        className="w-auto h-full drop-shadow-lg overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="euchreCardShadow" x="-15%" y="-15%" width="135%" height="135%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#020617" floodOpacity="0.4" />
          </filter>
          <linearGradient id="euchreCardFace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#FFFBEB" />
            <stop offset="100%" stopColor="#FEF3C7" />
          </linearGradient>
        </defs>

        {/* Ambient emerald/crimson glow */}
        <ellipse cx="180" cy="78" rx="115" ry="56" fill="#10B981" opacity="0.22" filter="blur(12px)" />

        {/* FANNED BOWER CARDS (Right Bower & Left Bower) */}
        <g filter="url(#euchreCardShadow)">
          {/* Left Card: Jack of Diamonds */}
          <g transform="translate(94, 14) rotate(-14)">
            <rect x="0" y="0" width="66" height="96" rx="8" fill="url(#euchreCardFace)" stroke="#FCD34D" strokeWidth="2" />
            <text x="9" y="20" fill="#DC2626" fontFamily="system-ui, 'Arial Black', sans-serif" fontWeight="900" fontSize="14">J</text>
            <text x="9" y="33" fill="#DC2626" fontSize="13">♦</text>
            <text x="33" y="62" textAnchor="middle" fill="#DC2626" fontSize="32">♦</text>
          </g>

          {/* Center Card: Right Bower Jack of Hearts */}
          <g transform="translate(146, 5)">
            <rect x="0" y="0" width="68" height="98" rx="9" fill="url(#euchreCardFace)" stroke="#F59E0B" strokeWidth="2.5" />
            <text x="9" y="21" fill="#DC2626" fontFamily="system-ui, 'Arial Black', sans-serif" fontWeight="900" fontSize="15">J</text>
            <text x="9" y="34" fill="#DC2626" fontSize="13">♥</text>
            <text x="34" y="64" textAnchor="middle" fill="#DC2626" fontSize="38">♥</text>
            <text x="34" y="86" textAnchor="middle" fill="#B45309" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="7.5" letterSpacing="0.5px">BOWER</text>
          </g>

          {/* Right Card: Jack of Spades */}
          <g transform="translate(200, 15) rotate(14)">
            <rect x="0" y="0" width="66" height="96" rx="8" fill="url(#euchreCardFace)" stroke="#FCD34D" strokeWidth="2" />
            <text x="9" y="20" fill="#0F172A" fontFamily="system-ui, 'Arial Black', sans-serif" fontWeight="900" fontSize="14">J</text>
            <text x="9" y="33" fill="#0F172A" fontSize="13">♠</text>
            <text x="33" y="62" textAnchor="middle" fill="#0F172A" fontSize="32">♠</text>
          </g>
        </g>

        {/* 3D WORDMARK "EUCHRE" */}
        <g>
          <text
            x="180"
            y="156"
            textAnchor="middle"
            fill="#020617"
            stroke="#020617"
            strokeWidth="16"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="62"
            letterSpacing="1px"
          >
            EUCHRE
          </text>
          <text
            x="180"
            y="152"
            textAnchor="middle"
            fill="#064E3B"
            stroke="#064E3B"
            strokeWidth="13"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="62"
            letterSpacing="1px"
          >
            EUCHRE
          </text>
          <text
            x="180"
            y="149"
            textAnchor="middle"
            fill="#10B981"
            stroke="#10B981"
            strokeWidth="7"
            strokeLinejoin="round"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="62"
            letterSpacing="1px"
          >
            EUCHRE
          </text>
          <text
            x="180"
            y="149"
            textAnchor="middle"
            fill="#FFFFFF"
            stroke="#D1FAE5"
            strokeWidth="1.5"
            fontFamily="Impact, 'Arial Black', 'Outfit', sans-serif"
            fontSize="62"
            letterSpacing="1px"
          >
            EUCHRE
          </text>
        </g>
      </svg>
    </div>
  );
}


