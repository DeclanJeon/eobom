export function ReviewBoundaryNote({ text }: { text: string }) {
  return (
    <section className="rounded-2xl bg-surface-low px-4 py-3">
      <p className="text-label-md leading-relaxed text-text-muted">{text}</p>
    </section>
  );
}
