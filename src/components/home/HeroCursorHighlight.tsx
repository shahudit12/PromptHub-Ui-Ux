import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export const HeroCursorHighlight: React.FC<{ containerRef: React.RefObject<HTMLDivElement | null> }> = ({ containerRef }) => {
  const mouseX = useMotionValue(-500);
  const mouseY = useMotionValue(-500);

  const springX = useSpring(mouseX, { damping: 25, stiffness: 150 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 150 });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [containerRef, mouseX, mouseY]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-px rounded-3xl transition-opacity duration-300 z-0 overflow-hidden"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      <motion.div
        className="w-[450px] h-[450px] rounded-full blur-3xl opacity-35"
        style={{
          background: 'radial-gradient(circle, rgba(49, 92, 74, 0.12) 0%, rgba(16, 185, 129, 0.04) 50%, transparent 75%)',
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />
    </motion.div>
  );
};

export default HeroCursorHighlight;
