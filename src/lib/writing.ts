import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

const directory = join(process.cwd(), "content", "writing");
const markdown = remark().use(remarkRehype).use(rehypeStringify);

export async function getWritingPosts() {
  "use cache";

  const files = (await readdir(directory, { withFileTypes: true }))
    .filter((file) => file.isFile() && /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(file.name));
  const posts = await Promise.all(files.map(async ({ name }) => {
    const { data, content } = matter(await readFile(join(directory, name), "utf8"));
    const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date;
    const { title, summary, draft } = data;
    if (typeof title !== "string" || typeof summary !== "string" ||
        typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        (draft !== undefined && typeof draft !== "boolean")) {
      throw new Error(`Invalid writing frontmatter in ${name}`);
    }
    return {
      slug: name.slice(0, -3),
      title,
      summary,
      date,
      draft: draft === true,
      html: String(await markdown.process(content)),
    };
  }));
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
