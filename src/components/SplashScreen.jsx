import { useEffect, useState } from 'react';
import logo from '../assets/logo.png';

/**
 * SplashScreen – hiển thị khi app khởi động lần đầu
 * - Tự động ẩn sau tối đa MAX_DISPLAY_MS
 * - Gọi onDone() khi xong để App.jsx bắt đầu load data
 */
const MAX_DISPLAY_MS = 1500;

export function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 400); // 400ms fade out animation
    }, MAX_DISPLAY_MS);

    return () => clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #0052CC 0%, #0068FF 50%, #2196F3 100%)',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* Outer glowing ring */}
      <div style={{
        position: 'relative',
        width: 120,
        height: 120,
        marginBottom: 24,
      }}>
        {/* Animated pulse ring */}
        <div style={{
          position: 'absolute',
          inset: -12,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.3)',
          animation: 'splashPulse 1.6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.5)',
          animation: 'splashPulse 1.6s ease-in-out infinite 0.4s',
        }} />

        {/* Logo container */}
        <div style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(255,255,255,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          <img
            src={logo}
            alt="Smeet"
            style={{
              width: 72,
              height: 72,
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))',
              animation: 'splashBounce 0.6s ease-out',
            }}
          />
        </div>
      </div>

      {/* App name */}
      <h1 style={{
        color: '#fff',
        fontSize: 32,
        fontWeight: 800,
        margin: '0 0 6px',
        letterSpacing: 2,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        textShadow: '0 2px 8px rgba(0,0,0,0.15)',
        animation: 'splashFadeUp 0.5s ease-out 0.2s both',
      }}>
        Smeet
      </h1>

      {/* Tagline */}
      <p style={{
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        margin: '0 0 36px',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        animation: 'splashFadeUp 0.5s ease-out 0.35s both',
      }}>
        Quản lý cuộc họp nhóm thông minh
      </p>

      {/* Loading dots */}
      <div style={{
        display: 'flex',
        gap: 8,
        animation: 'splashFadeUp 0.5s ease-out 0.5s both',
      }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              animation: `splashDot 1.2s ease-in-out infinite ${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes splashPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 0.2; }
        }
        @keyframes splashBounce {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes splashFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
