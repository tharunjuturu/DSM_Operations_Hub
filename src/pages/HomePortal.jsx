import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  Activity, Layers, Zap, BarChart2, Cpu,
  AppWindow, ChevronRight, LayoutGrid, Bell, Github
} from 'lucide-react';

// Centralized CSS Animations Block
const ANIMATION_STYLES = `
  :root {
    --premium-ease: cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* Easing and Base transitions */
  .smoothTransition {
    transition: all 0.4s var(--premium-ease);
  }

  /* Reusable Keyframe Animations */
  @keyframes pageEnter {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes slideLeft {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideRight {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes pulseRing {
    0% {
      transform: scale(0.95);
      opacity: 0.85;
    }
    50% {
      transform: scale(1.8);
      opacity: 0.3;
    }
    100% {
      transform: scale(2.5);
      opacity: 0;
    }
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes ambientFloatOne {
    0% { transform: translate(0px, 0px) scale(1); }
    50% { transform: translate(50px, -25px) scale(1.08); }
    100% { transform: translate(0px, 0px) scale(1); }
  }

  @keyframes ambientFloatTwo {
    0% { transform: translate(0px, 0px) scale(1); }
    50% { transform: translate(-60px, 40px) scale(1.05); }
    100% { transform: translate(0px, 0px) scale(1); }
  }

  @keyframes ambientFloatThree {
    0% { transform: translate(0px, 0px) rotate(0deg); }
    50% { transform: translate(30px, 30px) rotate(180deg); }
    100% { transform: translate(0px, 0px) rotate(360deg); }
  }

  @keyframes iconRotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes buttonShine {
    0% { left: -100%; }
    100% { left: 100%; }
  }

  @keyframes floating {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  @keyframes breathing {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.03); opacity: 0.95; }
  }

  @keyframes successBounce {
    0% { transform: scale(0); }
    70% { transform: scale(1.12); }
    100% { transform: scale(1); }
  }

  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }

  /* Reusable Utility Classes */
  .liftHover {
    transition: all 0.4s var(--premium-ease);
  }
  .liftHover:hover {
    transform: translateY(-5px);
  }

  .glowHover {
    transition: all 0.4s var(--premium-ease);
  }
  .glowHover:hover {
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
  }

  .rotateHover {
    transition: all 0.4s var(--premium-ease);
  }
  .rotateHover:hover {
    transform: rotate(5deg);
  }

  .magneticButton {
    transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  .magneticButton:active {
    transform: scale(0.96);
  }

  .glassBlur {
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .premiumShadow {
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  }

  /* GPU Optimizations */
  .gpuOptimize {
    will-change: transform, opacity;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  /* Page and Header entrance styling */
  .portal-page-enter {
    opacity: 0;
    animation: pageEnter 0.5s var(--premium-ease) forwards;
  }

  .portal-header-enter {
    opacity: 0;
    animation: fadeInDown 0.5s var(--premium-ease) forwards;
  }

  .portal-title {
    opacity: 0;
    animation: fadeInUp 0.6s var(--premium-ease) forwards;
    animation-delay: 50ms;
  }

  .portal-subtitle {
    opacity: 0;
    animation: fadeInUp 0.6s var(--premium-ease) forwards;
    animation-delay: 90ms;
  }

  /* Header Element Enhancements */
  .logo-container:hover {
    transform: rotate(90deg) scale(1.08);
    box-shadow: 0 0 25px rgba(99, 102, 241, 0.75) !important;
  }

  .user-avatar:hover {
    transform: translateY(-3px) rotate(4deg) scale(1.06);
    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.5) !important;
  }

  /* Premium Card Hover upgrade */
  .portal-card {
    opacity: 0;
    animation: fadeInUp 0.65s var(--premium-ease) forwards;
    transition: transform 0.4s var(--premium-ease), border-color 0.4s var(--premium-ease), box-shadow 0.4s var(--premium-ease) !important;
  }

  .portal-card:hover {
    transform: translateY(-6px) scale(1.01) rotateX(2deg) !important;
    border-color: rgba(255, 255, 255, 0.16) !important;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45) !important;
  }

  /* Card Icon hover zoom & glow */
  .portal-card:hover .card-icon-wrapper {
    transform: scale(1.12) rotate(8deg);
    box-shadow: 0 0 22px currentColor;
  }

  .card-icon-wrapper {
    transition: transform 0.3s var(--premium-ease), box-shadow 0.3s var(--premium-ease);
  }

  /* Active Indicator Concentric Ring */
  .animate-ping-badge {
    animation: pulseRing 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
  }

  /* Launch Button upgrades & shine effect */
  .launch-button {
    position: relative;
    overflow: hidden;
    transition: all 0.3s var(--premium-ease) !important;
  }

  .launch-button:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35) !important;
  }

  .launch-button:active {
    transform: translateY(0px) scale(0.98) !important;
  }

  .launch-button .chevron-icon {
    transition: transform 0.3s var(--premium-ease);
  }

  .launch-button:hover .chevron-icon {
    transform: translateX(4px);
  }

  .launch-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.18) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: skewX(-25deg);
    pointer-events: none;
  }

  .launch-button:hover::before {
    animation: buttonShine 0.75s var(--premium-ease) forwards;
  }

  /* Material Ripple click animation */
  .ripple-effect {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.22);
    pointer-events: none;
    transform: scale(0);
    animation: ripple 0.6s var(--premium-ease) forwards;
  }

  /* Accessibility Preferences */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-delay: 0s !important;
      animation-duration: 0s !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0s !important;
      scroll-behavior: auto !important;
      transform: none !important;
      will-change: auto !important;
    }
    .card-mouse-glow, .ambient-orb {
      display: none !important;
    }
  }
`;

// Helper function to trigger Material-style Ripple
const handleRippleClick = (e) => {
  const container = e.currentTarget;
  const rect = container.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  container.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
};

// Reusable animated counter component
const AnimatedCounter = React.memo(({ value, duration = 1200 }) => {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = progress * (2 - progress); // easeOutQuad
      setCount(Math.floor(easeProgress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{count}</span>;
});

// Reusable animated progress bar component
const AnimatedProgressBar = React.memo(({ targetWidth }) => {
  const [width, setWidth] = React.useState('0%');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(`${targetWidth}%`);
    }, 150);
    return () => clearTimeout(timer);
  }, [targetWidth]);

  return (
    <div style={{ width: '120px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{
        width: width,
        height: '100%',
        background: 'linear-gradient(90deg, #6366f1, #10b981)',
        borderRadius: '3px',
        transition: 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'width'
      }} />
    </div>
  );
});

// Workspace Card Component - Memoized for optimal rendering performance
const WorkspaceCard = React.memo(({ variant, index, onNavigate, onRippleClick }) => {
  const cardRef = React.useRef(null);
  const Icon = variant.icon;

  const handleMouseMove = React.useCallback((e) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.removeProperty('--mouse-x');
    cardRef.current.style.removeProperty('--mouse-y');
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => {
        onRippleClick(e);
        setTimeout(() => {
          onNavigate(variant.id);
        }, 120);
      }}
      className="glass-dark portal-card gpuOptimize"
      style={{
        padding: '30px',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        animationDelay: `${index * 80}ms`,
        cursor: 'pointer'
      }}
    >
      {/* Vercel-style Mouse Glow overlay */}
      <div className="card-mouse-glow" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `radial-gradient(350px circle at var(--mouse-x, -9999px) var(--mouse-y, -9999px), ${variant.color}15, transparent 80%)`,
        pointerEvents: 'none',
        zIndex: 1,
        transition: 'background 0.3s ease'
      }} />

      {/* Card Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 2, position: 'relative' }}>
        <div
          className="card-icon-wrapper"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: variant.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: variant.shadow,
            color: 'white'
          }}
        >
          <Icon size={26} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '750', margin: 0, color: 'white' }}>{variant.name}</h3>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.65rem',
              fontWeight: '600',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#34d399',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.15)'
            }}>
              <span style={{ position: 'relative', display: 'flex', width: '6px', height: '6px' }}>
                <span className="animate-ping-badge" style={{ position: 'absolute', height: '100%', width: '100%', borderRadius: '50%', backgroundColor: '#10b981', opacity: 0.75 }} />
                <span style={{ position: 'relative', borderRadius: '50%', height: '6px', width: '6px', backgroundColor: '#10b981' }} />
              </span>
              Active
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
            {variant.fullName}
          </span>
        </div>
      </div>

      {/* Description */}
      <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: '1.6', margin: 0, flex: 1, zIndex: 2, position: 'relative' }}>
        {variant.description}
      </p>

      {/* Action Launchers */}
      <div style={{
        paddingTop: '16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        zIndex: 2,
        position: 'relative'
      }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRippleClick(e);
            setTimeout(() => {
              onNavigate(variant.id);
            }, 120);
          }}
          className="launch-button gpuOptimize"
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '14px',
            border: `1px solid ${variant.color}40`,
            background: `${variant.color}12`,
            color: '#ffffff',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: `0 4px 12px ${variant.color}10`
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AppWindow size={18} />
            Launch Operations Hub
          </span>
          <ChevronRight className="chevron-icon" size={16} />
        </button>
      </div>
    </div>
  );
});

export default function HomePortal() {
  const navigate = useNavigate();
  const systemInfo = useStore(state => state.systemInfo);
  const username = systemInfo?.username || 'System User';

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(/[\._\s-]/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
  const initials = getInitials(username);

  // Memoized navigation handler to optimize card renders
  const handleNavigate = React.useCallback((id) => {
    navigate(`/hub/${id}/dashboard`);
  }, [navigate]);

  const VARIANTS = [
    {
      id: 'vsm_pt',
      name: 'VSM PT',
      fullName: 'VSM Test Plan',
      //description: 'Centralized environment for VSM PT validation milestones, team deliverables, and individual daily status logging.',
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      shadow: '0 4px 20px rgba(37, 99, 235, 0.25)',
      icon: Activity
    },
    {
      id: 'vsm_pc',
      name: 'VSM PC',
      fullName: 'VSM Manual Validation',
      //description: 'Workspace for VSM PC integration, tracking cross-functional task matrices and independent time-cards.',
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      shadow: '0 4px 20px rgba(139, 92, 246, 0.25)',
      icon: Layers
    },
    {
      id: 'bsi_pt',
      name: 'BSI PT',
      fullName: 'BSI Test Plan',
      //description: 'Operations control and performance tracking for the BSI PT testing environment and delivery schedules.',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      shadow: '0 4px 20px rgba(16, 185, 129, 0.25)',
      icon: Zap
    },
    {
      id: 'bsi_pc',
      name: 'BSI PC',
      fullName: 'BSI Validation',
      //description: 'Process validation tracking, metrics dashboards, and isolated personal trackers for the BSI PC family.',
      color: '#f97316',
      gradient: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
      shadow: '0 4px 20px rgba(249, 115, 22, 0.25)',
      icon: BarChart2
    },
    {
      id: 'bsi_auto',
      name: 'BSI AUTO',
      fullName: 'BSI Automation',
      //description: 'Automated test suite metrics, burn-down reports, and availability schedules for the automation engineering team.',
      color: '#06b6d4',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
      shadow: '0 4px 20px rgba(6, 182, 212, 0.25)',
      icon: Cpu
    }
  ];

  return (
    <div
      className="portal-page-enter gpuOptimize"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0b0f19 0%, #111827 50%, #1e1b4b 100%)',
        color: 'white',
        padding: '40px 24px',
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
        overflow: 'hidden',
        scrollBehavior: 'smooth'
      }}
    >
      {/* Centralized styling injection */}
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLES }} />

      {/* Floating Ambient Background Blobs */}
      <div className="ambient-orb gpuOptimize" style={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0) 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'ambientFloatOne 18s ease-in-out infinite alternate'
      }} />
      <div className="ambient-orb gpuOptimize" style={{
        position: 'absolute',
        bottom: '20%',
        right: '5%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0) 70%)',
        borderRadius: '50%',
        filter: 'blur(70px)',
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'ambientFloatTwo 22s ease-in-out infinite alternate'
      }} />
      <div className="ambient-orb gpuOptimize" style={{
        position: 'absolute',
        top: '50%',
        left: '35%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, rgba(16, 185, 129, 0) 70%)',
        borderRadius: '50%',
        filter: 'blur(50px)',
        zIndex: 0,
        pointerEvents: 'none',
        animation: 'ambientFloatThree 26s ease-in-out infinite alternate'
      }} />

      {/* Top Navbar with Glass Navigation Effect */}
      <header className="portal-header-enter glassBlur gpuOptimize" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1300px',
        margin: '0 auto 60px auto',
        width: '100%',
        padding: '16px 28px',
        background: 'rgba(15, 23, 42, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: '20px',
        boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
        zIndex: 10,
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)'
            }}
            className="logo-container"
          >
            <LayoutGrid color="white" size={22} className="logo-icon" style={{ transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>Main Portal</h1>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginTop: '-2px' }}>Internal tracker</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* GitHub Database Sync Settings Button */}
          <button
            onClick={(e) => {
              handleRippleClick(e);
              setTimeout(() => {
                navigate('/sync');
              }, 120);
            }}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94a3b8',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
            }}
            className="smoothTransition glowHover rotateHover"
            title="GitHub Database Sync Settings"
          >
            <Github size={18} />
          </button>

          {/* Notifications Button */}
          <button
            onClick={handleRippleClick}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94a3b8',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
            }}
            className="smoothTransition glowHover rotateHover"
            title="Notifications"
          >
            <Bell size={18} />
            <span style={{
              position: 'absolute',
              top: '11px',
              right: '11px',
              width: '6px',
              height: '6px',
              background: '#ef4444',
              borderRadius: '50%'
            }} />
          </button>

          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Welcome back, {username}</span>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '20px',
              background: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.95rem',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
            }}
            className="user-avatar"
          >
            {initials}
          </div>
        </div>
      </header>

      {/* Main Workspace Directory */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '1300px',
        margin: '0 auto',
        width: '100%',
        zIndex: 2,
        position: 'relative'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 className="portal-title" style={{
            fontSize: '2.75rem',
            fontWeight: '850',
            marginBottom: '12px',
            letterSpacing: '-1px',
            background: 'linear-gradient(to right, #ffffff 30%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            Choose Your Workspace
          </h2>
          <p className="portal-subtitle" style={{ fontSize: '1.05rem', color: '#94a3b8', maxWidth: '640px', margin: '12px auto 0 auto', lineHeight: '1.6' }}>
            Select a project variant to launch its dedicated operations hub or personal activity tracker. All data sets are isolated per variant.
          </p>
        </div>

        {/* System Metrics summary strip (Demonstrating Counters, Progress Bars and Badge Ring animations) */}
        <div className="metrics-strip animate-fade-in-up glassBlur" style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '28px',
          margin: '0 auto 48px auto',
          padding: '16px 32px',
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          maxWidth: '850px',
          width: '100%',
          zIndex: 2,
          position: 'relative',
          animation: 'fadeInUp 0.6s var(--premium-ease) forwards',
          animationDelay: '100ms',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Hubs:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white' }}>
              <AnimatedCounter value={5} />
            </span>
          </div>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Global Sync:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', marginRight: '4px' }}>
              <AnimatedCounter value={98} />%
            </span>
            <AnimatedProgressBar targetWidth={98} />
          </div>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Load:</span>
            <span style={{ fontSize: '1.15rem', fontWeight: '750', color: '#34d399' }}>Healthy</span>
            <span style={{ position: 'relative', display: 'flex', width: '8px', height: '8px' }}>
              <span className="animate-ping-badge" style={{ position: 'absolute', height: '100%', width: '100%', borderRadius: '50%', backgroundColor: '#10b981', opacity: 0.75 }} />
              <span style={{ position: 'relative', borderRadius: '50%', height: '8px', width: '8px', backgroundColor: '#10b981' }} />
            </span>
          </div>
        </div>

        {/* Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '28px',
          marginBottom: '40px',
          perspective: '1200px' // Perspective context for card rotateX hover effect
        }}>
          {VARIANTS.map((variant, index) => (
            <WorkspaceCard
              key={variant.id}
              variant={variant}
              index={index}
              onNavigate={handleNavigate}
              onRippleClick={handleRippleClick}
            />
          ))}
        </div>
      </main>

      <footer style={{
        textAlign: 'center',
        color: 'rgba(255,255,255,0.25)',
        marginTop: 'auto',
        fontSize: '0.8rem',
        paddingTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        alignItems: 'center',
        zIndex: 2,
        position: 'relative'
      }}>
        <div>&copy; {new Date().getFullYear()} Internal Tracker &bull; Main Portal Core 2.0</div>
        <div style={{ opacity: 0.8, fontSize: '0.75rem' }}>
          Version {systemInfo?.version || '2.0.0'} &bull; Built by {systemInfo?.builtBy || 'Tharun Kumar Juturu'}
        </div>
      </footer>
    </div>
  );
}
