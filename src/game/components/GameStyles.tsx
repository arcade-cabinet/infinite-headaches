/**
 * Game Styles Component
 * Global styles, fonts, and animations for the game
 */

export function GameStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap');
      
      /* Base font class */
      .game-font {
        font-family: 'Fredoka One', cursive;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      /* Title with floating animation */
      .game-title {
        font-family: 'Fredoka One', cursive;
        animation: float 3s ease-in-out infinite;
      }
      
      /* Floating animation */
      @keyframes float {
        0%, 100% { 
          transform: translateY(0px) rotate(-1deg); 
        }
        50% { 
          transform: translateY(-10px) rotate(1deg); 
        }
      }
      
      /* Perfect landing popup */
      @keyframes popUp {
        0% { 
          transform: translate(-50%, 0) scale(0.5); 
          opacity: 0; 
        }
        20% { 
          transform: translate(-50%, -20px) scale(1.2); 
          opacity: 1; 
        }
        100% { 
          transform: translate(-50%, -60px) scale(1); 
          opacity: 0; 
        }
      }
      
      .perfect-text {
        animation: popUp 1s ease-out forwards;
      }
      
      /* Pulse animation */
      @keyframes pulse {
        0%, 100% { 
          transform: scale(1);
          opacity: 1;
        }
        50% { 
          transform: scale(1.05);
          opacity: 0.9;
        }
      }
      
      .pulse-animation {
        animation: pulse 2s ease-in-out infinite;
      }
      
      /* Glow animation */
      @keyframes glow {
        0%, 100% {
          filter: drop-shadow(0 0 10px rgba(253, 216, 53, 0.5));
        }
        50% {
          filter: drop-shadow(0 0 20px rgba(253, 216, 53, 0.8));
        }
      }
      
      .glow-animation {
        animation: glow 2s ease-in-out infinite;
      }
      
      /* Shake animation (for headache effect) */
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10% { transform: translateX(-2px) rotate(-0.5deg); }
        20% { transform: translateX(2px) rotate(0.5deg); }
        30% { transform: translateX(-2px) rotate(-0.5deg); }
        40% { transform: translateX(2px) rotate(0.5deg); }
        50% { transform: translateX(-1px); }
        60% { transform: translateX(1px); }
        70% { transform: translateX(-1px); }
        80% { transform: translateX(1px); }
        90% { transform: translateX(0); }
      }
      
      .shake-animation {
        animation: shake 0.5s ease-in-out;
      }
      
      /* Bounce in animation */
      @keyframes bounceIn {
        0% {
          opacity: 0;
          transform: scale(0.3);
        }
        50% {
          transform: scale(1.05);
        }
        70% {
          transform: scale(0.9);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      .bounce-in {
        animation: bounceIn 0.6s ease-out;
      }
      
      /* Slide in from bottom */
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .slide-in-up {
        animation: slideInUp 0.5s ease-out;
      }
      
      /* Psychic wave effect */
      @keyframes psychicWave {
        0% {
          transform: scale(0.8);
          opacity: 0.8;
        }
        100% {
          transform: scale(2);
          opacity: 0;
        }
      }
      
      .psychic-wave {
        animation: psychicWave 1.5s ease-out infinite;
      }
      
      /* Mobile touch optimizations */
      @media (hover: none) and (pointer: coarse) {
        /* Increase touch targets on mobile */
        button {
          min-height: 44px;
          min-width: 44px;
        }
        
        /* Disable hover effects on touch devices */
        button:hover {
          transform: none;
        }
      }
      
      /* Prevent text selection during gameplay */
      .no-select {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      /* Prevent zoom on double tap */
      .no-zoom {
        touch-action: manipulation;
      }
      
      /* Safe area padding for notched devices */
      .safe-area-inset {
        padding-top: env(safe-area-inset-top, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        padding-left: env(safe-area-inset-left, 0px);
        padding-right: env(safe-area-inset-right, 0px);
      }
      
      /* Responsive container */
      .responsive-container {
        width: 100%;
        max-width: min(100vw, 100vh * 0.6);
        margin: 0 auto;
      }
      
      /* Smooth scrolling */
      html {
        scroll-behavior: smooth;
      }
      
      /* Remove tap highlight on mobile */
      * {
        -webkit-tap-highlight-color: transparent;
      }
    `}</style>
  );
}
