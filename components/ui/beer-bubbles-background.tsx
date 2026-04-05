"use client";

export function BeerBubblesBackground() {
  return (
    <>
      <div className="bottom-particles" aria-hidden="true">
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} className="bubble" />
        ))}
      </div>
      <div id="foam" aria-hidden="true" />
    </>
  );
}
