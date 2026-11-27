"use client";

import { useState } from "react";

const previews: Record<string, readonly [string, string]> = {
  "visual-storytelling": ["Blue-hour framing", "Color grade study"],
  "house-djing": ["House waveform", "After-hours palette"],
  "game-development": ["World geometry", "Atmospheric lighting"],
  "precision-barbering": ["Silhouette study", "Texture and transition"],
  "lion-dance": ["Costume palette", "Movement study"],
};

export default function CreativePreviews({ slug }: { slug: string }) {
  const [revealed, setRevealed] = useState<number | null>(null);
  const titles = previews[slug] ?? ["Composition study", "Color study"];
  return (
    <section aria-label="Creative previews" className="border-t border-hairline pt-5">
      <h3 className="text-sm font-semibold">Creative previews</h3>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {titles.map((title, index) => (
          <li key={title} className="min-w-0">
            <button
              type="button"
              aria-pressed={revealed === index}
              aria-label={`${title}, toggle full color`}
              onClick={() => setRevealed(revealed === index ? null : index)}
              className="creative-preview group block w-full overflow-hidden rounded-lg border border-hairline bg-background text-left hover:border-primary/70"
              data-art={slug}
              data-variant={index}
            >
              <span aria-hidden="true" className="creative-preview__image block aspect-[4/3]" />
              <span className="block border-t border-hairline px-2 py-2 font-mono text-[0.68rem] leading-snug text-slate-300">{title}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
