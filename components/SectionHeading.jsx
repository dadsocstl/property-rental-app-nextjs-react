const SectionHeading = ({ eyebrow, title, children }) => (
  <div className='flex flex-col gap-3'>
    {eyebrow && <p className='text-xs font-semibold uppercase tracking-[0.25em] text-primary'>{eyebrow}</p>}
    <h2 className='text-balance font-display text-4xl font-bold md:text-5xl'>{title}</h2>
    {children && <p className='max-w-xl leading-relaxed text-muted-foreground'>{children}</p>}
  </div>
);

export default SectionHeading;
