import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const content = (
    <div className="flex flex-col items-center gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary-500`} />
      {text && (
        <span className="text-gray-500 dark:text-gray-400 text-sm">{text}</span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

export const EntryCardSkeleton: React.FC = () => (
  <div className="card p-4 animate-pulse">
    <div className="flex gap-4">
      <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  </div>
);
