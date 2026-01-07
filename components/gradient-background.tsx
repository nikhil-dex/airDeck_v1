interface GradientBackgroundProps {
  variant?: 'radial' | 'linear' | 'mesh';
  className?: string;
  children?: React.ReactNode;
}

export function GradientBackground({
  variant = 'radial',
  className = '',
  children
}: GradientBackgroundProps) {
  const gradientStyles = {
    radial: 'bg-gradient-to-br from-black via-purple-950 to-black',
    linear: 'bg-gradient-to-b from-black via-purple-900/50 to-black',
    mesh: 'bg-black relative overflow-hidden'
  };

  return (
    <div className={`fixed inset-0 -z-10 ${gradientStyles[variant]} ${className}`}>
      {variant === 'mesh' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-800/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black" />
        </>
      )}
      {children}
    </div>
  );
}
