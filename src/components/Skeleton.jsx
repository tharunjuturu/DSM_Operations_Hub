import React from 'react';

export default function Skeleton({ className = "", variant = "rectangular", width = "100%", height = "100%" }) {
  const baseStyles = {
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 2.5s infinite linear',
    width: width,
    height: height
  };

  let borderRadius = '4px'; // rectangular
  if (variant === 'circular') borderRadius = '50%';
  if (variant === 'rounded') borderRadius = '8px';

  return (
    <div 
      className={`skeleton-loader ${className}`} 
      style={{ ...baseStyles, borderRadius }}
    />
  );
}
