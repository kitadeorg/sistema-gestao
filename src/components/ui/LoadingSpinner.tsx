// components/ui/LoadingSpinner.tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'orange' | 'blue' | 'gray';
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'orange',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-12 h-12 border-4',
    lg: 'w-16 h-16 border-4',
  };

  const colors = {
    orange: 'border-orange-500 border-t-transparent',
    blue: 'border-blue-500 border-t-transparent',
    gray: 'border-gray-500 border-t-transparent',
  };

  const spinner = (
    <div className={`${sizes[size]} ${colors[color]} rounded-full animate-spin`} />
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}