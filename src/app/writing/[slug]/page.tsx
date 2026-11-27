import Link from "next/link";
import { notFound } from "next/navigation";
import { getWritingPosts } from "@/lib/writing";

export async function generateStaticParams() {
  return (await getWritingPosts()).map(({ slug }) => ({ slug }));
}

export default async function WritingPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = (await getWritingPosts()).find((candidate) => candidate.slug === slug);
  if (!post) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
      <Link href="/writing" className="font-mono text-sm text-primary hover:text-glow">← Writing</Link>
      <article className="mt-8 rounded-2xl border border-hairline bg-surface p-6 sm:p-9">
        <header className="border-b border-hairline pb-6">
          <p className="font-mono text-xs text-rose-300"><time dateTime={post.date}>{post.date}</time>{post.draft && " · Draft"}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">{post.title}</h1>
          <p className="mt-4 text-zinc-400">{post.summary}</p>
        </header>
        <div className="mt-6 space-y-4 leading-relaxed text-zinc-300 [&_a]:text-glow [&_a]:underline [&_h2]:mt-7 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: post.html }} />
      </article>
    </main>
  );
}
