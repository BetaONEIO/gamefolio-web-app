import { useEffect, useState } from "react";

interface PaymentRedirectScreenProps {
  onBack: () => void;
  onReady?: () => void;
}

export default function PaymentRedirectScreen({
  onBack,
  onReady,
}: PaymentRedirectScreenProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 3) % 360);
    }, 16);

    const timeout = setTimeout(() => {
      onReady?.();
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onReady]);

  return (
    <div 
      className="w-full min-h-screen flex flex-col font-['Plus_Jakarta_Sans']"
      style={{ background: '#020617' }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 pt-12 pb-6"
        style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.3)' }}
      >
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-700"
          style={{ background: '#1e293b', border: '1px solid #1e293b' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 12H4M4 12L10 6M4 12L10 18" stroke="#F8FAFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        
        <span className="text-xl font-bold" style={{ color: '#fff' }}>
          Payment
        </span>
        
        <div className="w-10 h-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-[600px] mx-auto w-full">
        {/* Animated Spinner */}
        <div className="relative w-24 h-24 mb-8">
          {/* Glow effect */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{ 
              background: 'rgba(74, 222, 128, 0.2)',
              filter: 'blur(32px)',
              transform: 'scale(1.2)'
            }}
          />
          
          {/* Spinning ring */}
          <svg 
            width="96" 
            height="96" 
            viewBox="0 0 96 96" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ transform: `rotate(${rotation}deg)` }}
            className="absolute inset-0"
          >
            <circle cx="48" cy="48" r="44" stroke="rgba(74, 222, 128, 0.2)" strokeWidth="4" fill="none" />
            <path
              d="M48 4C25.9 4 8 21.9 8 44"
              stroke="#4ade80"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M29.2968 7.38666L25.9635 5.63666C23.0368 4.10166 21.5735 3.33333 20.0002 3.33333C18.4268 3.33333 16.9635 4.1 14.0368 5.63666L10.7035 7.38666C7.7485 8.93666 6.01016 9.85 4.9335 11.07L20.0002 18.6033L35.0668 11.07C33.9902 9.85 32.2535 8.93666 29.2968 7.38666Z" fill="#4ADE80" />
              <path fillRule="evenodd" clipRule="evenodd" d="M36.2468 13.2733L21.2502 20.7733V36.5067C22.4468 36.2083 23.8085 35.495 25.9635 34.3633L29.2968 32.6133C32.8818 30.7317 34.6752 29.7917 35.6718 28.1C36.6668 26.41 36.6668 24.305 36.6668 20.1V19.905C36.6668 16.75 36.6668 14.7767 36.2468 13.2733Z" fill="#4ADE80" />
              <path fillRule="evenodd" clipRule="evenodd" d="M18.7502 36.5067V20.7733L3.7535 13.2733C3.3335 14.7767 3.3335 16.75 3.3335 19.9017V20.0967C3.3335 24.305 3.3335 26.41 4.3285 28.1C5.32516 29.7917 7.1185 30.7333 10.7035 32.615L14.0368 34.3633C16.1918 35.495 17.5535 36.2083 18.7502 36.5067Z" fill="#4ADE80" />
            </svg>
          </div>
        </div>

        {/* Redirecting Text */}
        <h1 
          className="text-2xl font-bold text-center mb-4"
          style={{ color: '#fff', letterSpacing: '-0.6px' }}
        >
          Redirecting...
        </h1>

        {/* Description */}
        <p 
          className="text-center mb-8 max-w-[260px] font-medium"
          style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '26px' }}
        >
          Preparing your secure payment session. Please do not refresh the page.
        </p>

        {/* Secure Checkout Badge */}
        <div 
          className="flex items-center gap-2 px-4 py-2 rounded-full mb-6"
          style={{ 
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(30, 41, 59, 0.5)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M2.815 4.23501C2.5 4.68335 2.5 6.01668 2.5 8.68084V9.9925C2.5 14.6908 6.03249 16.9717 8.24915 17.9391C8.84998 18.2016 9.15082 18.3333 9.99998 18.3333C10.85 18.3333 11.15 18.2016 11.7508 17.9391C13.9675 16.9708 17.5 14.6917 17.5 9.9925V8.68084C17.5 6.01584 17.5 4.68335 17.185 4.23501C16.8708 3.78752 15.6183 3.35835 13.1125 2.50085L12.635 2.33752C11.3291 1.89002 10.6766 1.66669 9.99998 1.66669C9.32332 1.66669 8.67082 1.89002 7.36498 2.33752L6.88748 2.50002C4.38165 3.35835 3.12915 3.78752 2.815 4.23501ZM12.7558 8.08918C12.9989 7.84606 12.9989 7.45076 12.7558 7.20765C12.5127 6.96453 12.1174 6.96453 11.8743 7.20765L8.95832 10.1236L8.12582 9.29115C7.88271 9.04803 7.48741 9.04803 7.24429 9.29115C7.00117 9.53426 7.00117 9.92956 7.24429 10.1727L8.51756 11.446C8.76067 11.6891 9.15597 11.6891 9.39909 11.446L12.7558 8.08918Z" fill="#4ADE80" />
          </svg>
          <span 
            className="text-sm font-bold uppercase"
            style={{ color: '#fff', letterSpacing: '0.35px' }}
          >
            Secure Checkout
          </span>
        </div>

        {/* Powered By */}
        <div className="flex flex-col items-center gap-2">
          <span 
            className="text-xs uppercase"
            style={{ color: '#94a3b8', letterSpacing: '1.2px' }}
          >
            Powered by
          </span>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M20 36.6667C17.6944 36.6667 15.5278 36.2289 13.5 35.3533C11.4722 34.4778 9.70833 33.2906 8.20833 31.7917C6.70833 30.2928 5.52111 28.5289 4.64667 26.5C3.77222 24.4711 3.33444 22.3044 3.33333 20C3.33222 17.6955 3.77 15.5289 4.64667 13.5C5.52333 11.4711 6.71056 9.70721 8.20833 8.20832C9.70611 6.70943 11.47 5.5222 13.5 4.64665C15.53 3.77109 17.6967 3.33331 20 3.33331C22.3033 3.33331 24.47 3.77109 26.5 4.64665C28.53 5.5222 30.2939 6.70943 31.7917 8.20832C33.2894 9.70721 34.4767 11.4711 35.3533 13.5C36.23 15.5289 36.6678 17.6955 36.6667 20C36.6656 22.3044 36.2278 24.4711 35.3533 26.5C34.4789 28.5289 33.2917 30.2928 31.7917 31.7917C30.2917 33.2906 28.5278 34.4778 26.5 35.3533C24.4722 36.2289 22.3056 36.6667 20 36.6667Z" fill="#4ade80"/>
            <path d="M14 20L18 24L26 16" stroke="#020617" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Footer - Security Info */}
      <div 
        className="flex flex-col items-center gap-6 px-6 py-10"
        style={{ 
          background: 'rgba(2, 6, 23, 0.5)',
          borderTop: '1px solid rgba(30, 41, 59, 0.3)'
        }}
      >
        {/* Security Icons */}
        <div className="flex items-center gap-4">
          {/* Lock Icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M16.25 6.25H13.75V4.375C13.75 2.30393 12.0711 0.625 10 0.625C7.92893 0.625 6.25 2.30393 6.25 4.375V6.25H3.75C3.05964 6.25 2.5 6.80964 2.5 7.5V16.25C2.5 16.9404 3.05964 17.5 3.75 17.5H16.25C16.9404 17.5 17.5 16.9404 17.5 16.25V7.5C17.5 6.80964 16.9404 6.25 16.25 6.25Z" fill="#F8FAFC" />
            <path fillRule="evenodd" clipRule="evenodd" d="M10.625 12.393V14.375C10.625 14.7202 10.3452 15 10 15C9.65482 15 9.375 14.7202 9.375 14.375V12.393C8.51403 12.0886 7.99758 11.2082 8.152 10.3081C8.30643 9.40809 9.08681 8.7502 10 8.7502C10.9132 8.7502 11.6936 9.40809 11.848 10.3081C12.0024 11.2082 11.486 12.0886 10.625 12.393Z" fill="#020617" />
            <path fillRule="evenodd" clipRule="evenodd" d="M12.5 6.25H7.5V4.375C7.5 2.99429 8.61929 1.875 10 1.875C11.3807 1.875 12.5 2.99429 12.5 4.375V6.25Z" fill="#020617" />
          </svg>

          {/* Shield Icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M16.25 3.125H3.75C3.05964 3.125 2.5 3.68464 2.5 4.375V8.75C2.5 12.8687 4.49375 15.3648 6.16641 16.7336C7.96797 18.207 9.76016 18.707 9.83828 18.7281C9.9457 18.7573 10.059 18.7573 10.1664 18.7281C10.2445 18.707 12.0344 18.207 13.8383 16.7336C15.5063 15.3648 17.5 12.8687 17.5 8.75V4.375C17.5 3.68464 16.9404 3.125 16.25 3.125Z" fill="#F8FAFC" />
            <path d="M7.5 10L9.16667 11.6667L12.5 8.33333" stroke="#020617" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>

          {/* Checkmark Circle Icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8.75" fill="#F8FAFC" />
            <path d="M6.5 10L9 12.5L13.5 7.5" stroke="#020617" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* SSL Text */}
        <span 
          className="text-[10px] font-medium uppercase text-center"
          style={{ color: '#94a3b8', letterSpacing: '2px' }}
        >
          256-BIT SSL ENCRYPTED CONNECTION
        </span>
      </div>
    </div>
  );
}
