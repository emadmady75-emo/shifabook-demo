'use client';

import React, { useState, useRef, useEffect } from 'react';

interface PatientPhoneLinkProps {
  phone: string;
  isAr: boolean;
}

export default function PatientPhoneLink({ phone, isAr }: PatientPhoneLinkProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize Egyptian phone number for WhatsApp
  // E.g., 01005125271 -> 201005125271
  const getWhatsAppNumber = (num: string) => {
    const cleaned = num.replace(/\D/g, ''); // keep only digits
    if (cleaned.startsWith('01') && cleaned.length === 11) {
      return `2${cleaned}`;
    }
    if (cleaned.startsWith('201') && cleaned.length === 12) {
      return cleaned;
    }
    // fallback if already prefix exists or general case
    if (cleaned.startsWith('00201') && cleaned.length === 14) {
      return cleaned.substring(2);
    }
    return cleaned;
  };

  const normalizedWhatsApp = getWhatsAppNumber(phone);

  // Handle click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      || (typeof window !== 'undefined' && window.innerWidth <= 768);

    if (isMobile) {
      window.location.href = `tel:${phone}`;
    } else {
      setShowMenu(!showMenu);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const titleText = isAr ? 'اتصل بالمريض' : 'Call Patient';

  return (
    <div ref={containerRef} className="relative inline-block text-right" dir={isAr ? 'rtl' : 'ltr'}>
      <span
        onClick={handlePhoneClick}
        title={titleText}
        className="text-cyan-400 hover:text-cyan-300 cursor-pointer font-mono text-xs font-semibold transition-colors duration-150 select-all"
      >
        {phone}
      </span>

      {showMenu && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 mt-1.5 w-44 rounded-2xl bg-[#09151e] border border-cyan-500/20 shadow-2xl p-2.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 top-full right-0"
        >
          {/* Action: Call */}
          <a
            href={`tel:${phone}`}
            onClick={() => setShowMenu(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-cyan-500/10 text-xs font-bold transition-all text-right w-full"
          >
            <span className="text-cyan-400 text-sm">📞</span>
            <span>{isAr ? 'اتصال مباشر' : 'Call Patient'}</span>
          </a>

          {/* Action: WhatsApp */}
          <a
            href={`https://wa.me/${normalizedWhatsApp}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setShowMenu(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-emerald-500/10 text-xs font-bold transition-all text-right w-full"
          >
            <span className="text-emerald-400 text-sm">💬</span>
            <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
          </a>

          {/* Action: Copy */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-cyan-500/10 text-xs font-bold transition-all text-right w-full"
          >
            <span className="text-cyan-400 text-sm">📋</span>
            <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرقم' : 'Copy Number')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
