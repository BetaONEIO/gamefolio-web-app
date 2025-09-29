import React from 'react';
import { cn } from '@/lib/utils';
import { useLazyImage } from '@/hooks/use-lazy-image';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  rootMargin?: string;
  threshold?: number;
  fallback?: React.ReactNode;
  showLoadingSpinner?: boolean;
  containerClassName?: string;
}

export function LazyImage({
  src,
  alt,
  className,
  placeholder,
  rootMargin = '50px',
  threshold = 0.1,
  fallback,
  showLoadingSpinner = false,
  containerClassName,
  ...props
}: LazyImageProps) {
  const [ref, { imageSrc, isLoading, hasError }] = useLazyImage<HTMLDivElement>({
    src,
    placeholder,
    rootMargin,
    threshold,
  });

  return (
    <div 
      ref={ref} 
      className={cn('relative', containerClassName)}
    >
      {/* Loading spinner */}
      {isLoading && showLoadingSpinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      
      {/* Error fallback */}
      {hasError && fallback ? (
        fallback
      ) : (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-50' : 'opacity-100',
            className
          )}
          {...props}
        />
      )}
    </div>
  );
}

// Specialized component for avatars with built-in fallback
interface LazyAvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackText?: string;
  showLoadingSpinner?: boolean;
}

export function LazyAvatar({
  src,
  alt,
  size = 'md',
  className,
  fallbackText,
  showLoadingSpinner = true,
}: LazyAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const [ref, { imageSrc, isLoading, hasError }] = useLazyImage<HTMLDivElement>({
    src: src || '',
    rootMargin: '100px',
    threshold: 0.1,
  });

  const initials = fallbackText || alt.charAt(0).toUpperCase();

  if (!src) {
    return (
      <div 
        className={cn(
          'rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold',
          sizeClasses[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      className={cn(
        'relative rounded-full overflow-hidden bg-muted',
        sizeClasses[size],
        className
      )}
    >
      {/* Loading spinner */}
      {isLoading && showLoadingSpinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      
      {/* Image or fallback */}
      {hasError ? (
        <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
          {initials}
        </div>
      ) : (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
        />
      )}
    </div>
  );
}