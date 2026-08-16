/** Per-section loading fallback — recessive skeleton tone, same as the shared (app)/loading.tsx, sized for a SectionCard-shaped block. */
export default function SectionSkeleton({ className = "h-64" }: { className?: string }) {
  return (
    <div aria-hidden className={`animate-pulse rounded-2xl bg-skeleton ${className}`} />
  );
}
