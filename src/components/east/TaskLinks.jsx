export default function TaskLinks({ urlText, description }) {
  const urls = urlText?.match(/https?:\/\/[^\s]+/g) || [];
  if (!urls.length) return null;

  if (urls.length === 1) {
    return <a href={urls[0]} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm font-semibold text-neon-cyan underline underline-offset-4">{description || 'Open link'}</a>;
  }

  return <div className="mt-3">
    {description && <p className="mb-2 text-sm text-card-foreground">{description}</p>}
    <div className="flex flex-wrap gap-2">
      {urls.map((url, index) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="rounded-lg border border-neon-cyan px-3 py-2 text-sm font-semibold text-neon-cyan underline underline-offset-4">Open link {index + 1}</a>)}
    </div>
  </div>;
}