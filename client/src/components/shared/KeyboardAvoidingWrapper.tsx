import { useEffect, useRef, ReactNode } from "react";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

interface KeyboardAvoidingWrapperProps {
  children: ReactNode;
  className?: string;
  /** Extra padding (px) to add below the keyboard; defaults to 16 */
  extraPadding?: number;
}

export function KeyboardAvoidingWrapper({ children, className = "", extraPadding = 16 }: KeyboardAvoidingWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    const isMobile = /iPad|iPhone|iPod|Android/.test(navigator.userAgent) || window.innerWidth < 768;
    if (!isMobile) return;

    const scrollActiveIntoView = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.isContentEditable)) return;
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable)) return;
      // Delay to allow keyboard to fully open before scrolling
      setTimeout(scrollActiveIntoView, 320);
    };

    const handleViewportResize = () => {
      setTimeout(scrollActiveIntoView, 100);
    };

    document.addEventListener("focusin", handleFocusIn);
    window.visualViewport?.addEventListener("resize", handleViewportResize, { passive: true });

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={keyboardHeight > 0 ? { paddingBottom: `${keyboardHeight + extraPadding}px` } : undefined}
    >
      {children}
    </div>
  );
}

export default KeyboardAvoidingWrapper;
