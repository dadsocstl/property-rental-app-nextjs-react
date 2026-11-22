'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Fades and lifts its direct children into view as they scroll in, staggered.
 * Content stays visible when the user prefers reduced motion.
 */
const Reveal = ({ as: Tag = 'div', children, className, stagger = 0.08, y = 40, ...props }) => {
  const ref = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const items = gsap.utils.toArray(ref.current.children);
        if (!items.length) return;
        gsap.from(items, {
          autoAlpha: 0,
          y,
          duration: 0.9,
          ease: 'power3.out',
          stagger,
          scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [children?.length] }
  );

  return (
    <Tag ref={ref} className={className} {...props}>
      {children}
    </Tag>
  );
};

export default Reveal;
