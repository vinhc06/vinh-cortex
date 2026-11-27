import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCortexGraph, getNodeBySlug } from "@/lib/cortex";
import { resolveMediaUrl } from "@/lib/media";
import { cortexHomeHref, cortexIndexHref } from "@/data/navigation";
import { archivedNodeSlugs, isResumeCore, lobeColors, nodeHref } from "@/types/cortex";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

export function generateStaticParams() {
  return [...getCortexGraph().nodes.map(({ slug }) => slug), ...archivedNodeSlugs].map((slug) => ({ slug }));
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = nodeHref(slug);
  if (destination !== `/nodes/${slug}`) redirect(destination);
  const node = getNodeBySlug(slug);
  if (!node) notFound();

  const { links, nodes } = getCortexGraph();
  const relatedSlugs = new Set<string>();
  for (const { source, target } of links) {
    if (source === slug) relatedSlugs.add(target);
    if (target === slug) relatedSlugs.add(source);
  }
  relatedSlugs.delete(slug);
  const related = nodes.filter((candidate) => relatedSlugs.has(candidate.slug));
  const metrics = Object.entries(node.metrics ?? {});
  const videoSrc = resolveMediaUrl(node.videoKey);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href={isResumeCore(node) ? cortexIndexHref : cortexHomeHref} className="font-mono text-sm text-primary hover:text-glow">
        {isResumeCore(node) ? "← Back to index" : "← Back to Cortex"}
      </Link>
      <article className="mt-8 rounded-2xl border border-hairline bg-surface p-6 sm:p-10">
        <header className="border-b border-hairline pb-8">
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <span style={{ color: lobeColors[node.lobe] }} className="rounded-full border border-hairline bg-background px-3 py-1 capitalize">
              {node.lobe}
            </span>
            <span className="capitalize text-zinc-300">{node.status}</span>
            <time className="text-zinc-400" dateTime={node.date}>
              {dateFormat.format(new Date(node.date))}
            </time>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            {node.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-300">{node.summary}</p>
          {node.tags.length > 0 && (
            <ul aria-label="Tags" className="mt-5 flex flex-wrap gap-2">
              {node.tags.map((tag) => (
                <li key={tag} className="rounded-md border border-hairline bg-background px-2.5 py-1 font-mono text-xs text-zinc-300">{tag}</li>
              ))}
            </ul>
          )}
          {node.repoUrl && (
            <a href={node.repoUrl} className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-glow">
              View on GitHub <span aria-hidden="true" className="ml-2">↗</span>
            </a>
          )}
        </header>

        {metrics.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Metrics</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {metrics.map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-lg border border-hairline bg-background p-4">
                  <dt className="text-sm capitalize text-zinc-400">{label.replace(/([a-z])([A-Z])/g, "$1 $2")}</dt>
                  <dd className="mt-1 break-words font-mono text-sm text-glow">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {node.videoKey && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Video</h2>
            {videoSrc ? (
              <video aria-label={node.title} src={videoSrc} controls playsInline preload="metadata" className="aspect-video w-full rounded-lg border border-hairline bg-background">
                Your browser does not support HTML5 video.
              </video>
            ) : (
              <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-hairline bg-background p-6 text-center text-sm text-zinc-400">
                Video preview is currently unavailable.
              </div>
            )}
          </section>
        )}

        <div
          className="mt-8 space-y-4 leading-relaxed text-zinc-300 [&_a]:text-glow [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_code]:font-mono [&_code]:text-glow [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-background [&_pre]:p-4 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: node.contentHtml }}
        />

        {related.length > 0 && (
          <section className="mt-8 border-t border-hairline pt-6">
            <h2 className="text-lg font-semibold">Connected case studies</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {related.map((connection) => (
                <li key={connection.slug}>
                  <Link href={nodeHref(connection.slug)} className="inline-block rounded-full border border-hairline bg-background px-3 py-2 text-sm text-primary hover:border-primary hover:text-glow">
                    {connection.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </main>
  );
}
