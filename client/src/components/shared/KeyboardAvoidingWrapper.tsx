import { useEffect, useRef, ReactNode } from "react";

interface KeyboardAvoidingWrapperProps {
  children: ReactNode;
  className?: string;
}

export function KeyboardAvoidingWrapper({ children, className = "" }: KeyboardAvoidingWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;

    if (!isMobile) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        return;
      }

      setTimeout(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest"
        });

        if (isIOS) {
          const viewportHeight = window.visualViewport?.height || window.innerHeight;
          const elementRect = target.getBoundingClientRect();
          const elementBottom = elementRect.bottom;
          
          if (elementBottom > viewportHeight - 50) {
            const scrollAmount = elementBottom - viewportHeight + 100;
            window.scrollBy({ top: scrollAmount, behavior: "smooth" });
          }
        }
      }, 300);
    };

    const handleViewportResize = () => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)) {
        setTimeout(() => {
          activeElement.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }, 100);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
    }

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportResize);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

export default KeyboardAvoidingWrapper;
