import React from 'react';

export const ParticleSprinkles: React.FC<{ density?: number; className?: string }> = ({
  className = '',
}) => {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
};

export default ParticleSprinkles;
