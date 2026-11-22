'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import { useRef } from 'react';
import PropertySearchForm from './PropertySearchForm';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const HEADLINE = ['Find', 'the', 'perfect', 'rental.'];

const Hero = () => {
  const root = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap
          .timeline({ defaults: { ease: 'expo.out' } })
          .from('[data-hero-image]', { scale: 1.15, duration: 2.2, ease: 'power2.out' }, 0)
          .from('[data-word]', { yPercent: 110, duration: 1.2, stagger: 0.09 }, 0.15)
          .from('[data-underline]', { scaleX: 0, transformOrigin: 'left center', duration: 1 }, 0.7)
          .from('[data-hero-fade]', { autoAlpha: 0, y: 24, duration: 0.9, stagger: 0.1 }, 0.8);

        gsap.to('[data-hero-image]', {
          yPercent: 12,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section ref={root} className='relative isolate overflow-hidden'>
      <div className='absolute inset-0 -z-10'>
        <Image
          data-hero-image
          src='/images/hero-dusk.png'
          alt=''
          fill
          priority
          sizes='100vw'
          className='object-cover'
        />
        <div className='absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/10' />
        <div className='absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent' />
      </div>

      <div className='container flex min-h-[640px] flex-col justify-center gap-8 py-24 md:min-h-[78vh]'>
        <p data-hero-fade className='text-sm font-semibold uppercase tracking-[0.25em] text-primary'>
          Apartments · Cabins · Lofts · Homes
        </p>
        <h1 className='max-w-4xl font-display text-6xl font-bold leading-[0.95] sm:text-7xl lg:text-8xl'>
          {HEADLINE.map((word) => (
            <span key={word} className='mr-[0.22em] inline-block overflow-hidden pb-2 align-bottom'>
              <span data-word className='inline-block'>
                {word === 'perfect' ? (
                  <span className='relative text-primary'>
                    {word}
                    <span
                      data-underline
                      aria-hidden='true'
                      className='absolute -bottom-1 left-0 h-1.5 w-full rounded-full bg-accent'
                    />
                  </span>
                ) : (
                  word
                )}
              </span>
            </span>
          ))}
        </h1>
        <p data-hero-fade className='max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground'>
          Discover places to stay for a weekend or a year. Bookmark favourites, message owners, and list your own
          property in minutes.
        </p>
        <div data-hero-fade className='w-full max-w-3xl'>
          <PropertySearchForm />
        </div>
      </div>
    </section>
  );
};

export default Hero;
