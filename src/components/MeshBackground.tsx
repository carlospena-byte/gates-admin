export function MeshBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="mesh-bg absolute inset-0" />
      <div className="mesh-grid absolute inset-0" />
      <div className="mesh-vignette absolute inset-0" />
    </div>
  );
}
