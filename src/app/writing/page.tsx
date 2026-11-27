import Link from "next/link";
import { getWritingPosts } from "@/lib/writing";

export const metadata = { title: "Frontier Tech Writing | Vinh Cortex" };

export default async function WritingPage() {
  const posts = await getWritingPosts();
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8">
      <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">Frontier Tech Writing</h1>
      <p className="mt-3 text-zinc-400">Notes and drafts on local-first AI and emerging interfaces.</p>
      <ul className="mt-8 grid gap-4">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/writing/${post.slug}`} className="block rounded-xl border border-hairline bg-surface p-5 hover:border-rose-400">
              <p className="font-mono text-xs text-rose-300"><time dateTime={post.date}>{post.date}</time>{post.draft && " · Draft"}</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{post.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{post.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
