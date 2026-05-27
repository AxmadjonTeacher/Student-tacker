import React, { useState, useEffect } from 'react';
import { X, Download, Share, PlusSquare, Smartphone } from 'lucide-react';
import iconLight from '../assets/icon-light.png';
import iconDark from '../assets/icon-dark.png';

interface InstallAppDrawerProps {
  theme: 'light' | 'dark';
  deferredPrompt: any;
  onClearPrompt: () => void;
}

const InstallAppDrawer: React.FC<InstallAppDrawerProps> = ({
  theme,
  deferredPrompt,
  onClearPrompt
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

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

  const handleDismiss = () => {
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
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
            src={theme === 'dark' ? iconDark : iconLight}
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
                iOS uchun qo'llanma:
              </div>
              <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>
                  Safari brauzerining pastki qismidagi{' '}
                  <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(13,148,136,0.1)', padding: '2px 4px', borderRadius: '4px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    <Share size={12} style={{ marginRight: '2px' }} /> Ulashish (Share)
                  </span>{' '}
                  tugmasini bosing.
                </li>
                <li>
                  Menyudan{' '}
                  <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(13,148,136,0.1)', padding: '2px 4px', borderRadius: '4px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    <PlusSquare size={12} style={{ marginRight: '2px' }} /> Bosh ekranga qo'shish (Add to Home Screen)
                  </span>{' '}
                  bandini tanlang.
                </li>
                <li>Yuqoridagi o'ng burchakdagi "Qo'shish" (Add) tugmasini bosing.</li>
              </ol>
            </div>
          ) : (
            <div>
              Ushbu ilovani telefoningizga yuklab olish orqali unga tezkor kirish va oflayn rejimda foydalanish imkoniyatiga ega bo'lasiz.
            </div>
          )}
        </div>

        {/* Action Button */}
        {platform !== 'ios' && (
          <button
            onClick={handleInstallClick}
            disabled={!deferredPrompt}
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '16px',
              background: 'var(--accent-gradient)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: deferredPrompt ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)',
              opacity: deferredPrompt ? 1 : 0.6,
              transition: 'all 0.2s',
            }}
          >
            <Download size={16} />
            ILOVA SIFATIDA O'RNATISH
          </button>
        )}
      </div>
    </div>
  );
};

export default InstallAppDrawer;
