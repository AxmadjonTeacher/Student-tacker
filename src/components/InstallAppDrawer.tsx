import React, { useState, useEffect } from 'react';
import { X, Download, Share, PlusSquare, Smartphone } from 'lucide-react';
import iconLight from '../assets/icon-light.png';

interface InstallAppDrawerProps {
  deferredPrompt: any;
  onClearPrompt: () => void;
}

const InstallAppDrawer: React.FC<InstallAppDrawerProps> = ({
  deferredPrompt,
  onClearPrompt
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [showIosOverlay, setShowIosOverlay] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return; // Already installed, don't show prompt
    }

    // Check localStorage if prompt was dismissed
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIos) {
      setPlatform('ios');
      // Show prompt after a short delay for iOS
      const timer = setTimeout(() => setIsOpen(true), 3000);
      return () => clearTimeout(timer);
    } else if (isAndroid) {
      setPlatform('android');
      // Show prompt if we have the deferred install prompt
      if (deferredPrompt) {
        setIsOpen(true);
      }
    } else {
      // For desktop or other devices, if deferredPrompt is available
      setPlatform('other');
      if (deferredPrompt) {
        setIsOpen(true);
      }
    }
  }, [deferredPrompt]);

  // Handle manual install click
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the browser install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA installation outcome: ${outcome}`);

    // Clear the deferred prompt since it can only be used once
    onClearPrompt();
    setIsOpen(false);
  };

  // Smart router for button click
  const handleCtaClick = () => {
    if (platform === 'ios') {
      setShowIosOverlay(true);
    } else {
      handleInstallClick();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.25s ease-out',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--bg-card)',
          borderRadius: '24px',
          padding: '1.25rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1.5px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          position: 'relative',
          animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Close Button */}
          <button
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              background: 'var(--bg-card-hover)',
              border: 'none',
              color: 'var(--text-secondary)',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img
              src={iconLight}
              alt="App Icon"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            />
            <div>
              <h3 style={{
                fontSize: '0.95rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0,
                letterSpacing: '-0.01em'
              }}>
                AL-XORAZMIY SCHOOL
              </h3>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                margin: '0.15rem 0 0 0',
                fontWeight: 500
              }}>
                Bosh ekranga ilova sifatida qo'shish
              </p>
            </div>
          </div>

          {/* Content depending on Platform */}
          <div style={{
            background: 'var(--bg-card-hover)',
            padding: '0.85rem 1rem',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            fontSize: '0.8rem',
            lineHeight: 1.5,
            color: 'var(--text-primary)'
          }}>
            {platform === 'ios' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  <Smartphone size={16} color="var(--accent-primary)" />
                  iOS uchun yuklab olish:
                </div>
                <div>
                  Ushbu ilovani Safari brauzerining pastki qismidagi ulashish menyusi orqali ekranga qo'shishingiz mumkin.
                </div>
              </div>
            ) : (
              <div>
                Ushbu ilovani telefoningizga yuklab olish orqali unga tezkor kirish va oflayn rejimda foydalanish imkoniyatiga ega bo'lasiz.
              </div>
            )}
          </div>

          {/* Action Button for installation instructions/native prompt */}
          <button
            onClick={handleCtaClick}
            disabled={platform !== 'ios' && !deferredPrompt}
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '16px',
              background: 'var(--accent-gradient)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: (platform === 'ios' || deferredPrompt) ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)',
              opacity: (platform === 'ios' || deferredPrompt) ? 1 : 0.6,
              transition: 'all 0.2s',
            }}
          >
            <Download size={16} />
            {platform === 'ios' ? "O'RNATISH QO'LLANMASI" : "ILOVA SIFATIDA O'RNATISH"}
          </button>
        </div>
      </div>

      {/* iOS Visual Overlay Guide */}
      {showIosOverlay && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          {/* Visual Instruction Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            textAlign: 'center',
            position: 'relative',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 850, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
              AL-XORAZMIY SCHOOL
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
              Ilovani bosh ekranga qo'shish uchun Safari brauzerida quyidagi amallarni bajaring:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(13, 148, 136, 0.1)', color: 'var(--accent-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0
                }}>1</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  Safari pastki panelidagi <Share size={16} color="var(--accent-primary)" /> (Share) tugmasini bosing.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(13, 148, 136, 0.1)', color: 'var(--accent-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0
                }}>2</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  Menyudan <PlusSquare size={16} color="var(--accent-primary)" /> "Bosh ekranga qo'shish" (Add to Home Screen) tanlang.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosOverlay(false)}
              style={{
                background: 'var(--accent-gradient)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '0.75rem',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)',
                marginTop: '0.5rem'
              }}
            >
              TUSHUNARLI
            </button>
          </div>

          {/* Animated pulsing pointing arrow at the bottom of the screen */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#ffffff',
            zIndex: 10001,
            pointerEvents: 'none'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              Ulashish tugmasi bu yerda
            </span>
            <div className="pulse-arrow" style={{
              width: '0',
              height: '0',
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: '16px solid var(--accent-primary)',
              animation: 'bounceArrow 1.2s infinite ease-in-out',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }} />
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes bounceArrow {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(8px); }
            }
            @keyframes scaleUp {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}} />
        </div>
      )}
    </>
  );
};

export default InstallAppDrawer;
