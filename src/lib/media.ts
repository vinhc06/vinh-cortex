export function resolveMediaUrl(key?: string): string | undefined {
  const base = process.env.NEXT_PUBLIC_MEDIA_CDN_URL?.trim().replace(/\/+$/, "");
  const path = key?.replace(/^\/+/, "");
  if (!base || !path) return undefined;

  return `${base}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
