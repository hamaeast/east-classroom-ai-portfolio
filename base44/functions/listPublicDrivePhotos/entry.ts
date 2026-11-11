import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// The classroom photo folder is configuration, not code. Set the
// CLASSROOM_PHOTO_FOLDER_URL secret in the Base44 dashboard to a Google Drive
// folder that is intentionally shared publicly. When unset, no photos are listed.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const folderUrl = Deno.env.get('CLASSROOM_PHOTO_FOLDER_URL') || '';
    if (!folderUrl) return Response.json({ photos: [], configured: false });
    if (!/^https:\/\/drive\.google\.com\/drive\/folders\//.test(folderUrl)) return Response.json({ error: 'CLASSROOM_PHOTO_FOLDER_URL must be a Google Drive folder link' }, { status: 500 });
    const folderResponse = await fetch(folderUrl);
    if (!folderResponse.ok) return Response.json({ error: 'Unable to read public photo folder' }, { status: 502 });

    const html = await folderResponse.text();
    const rowPattern = /aria-label="([^"]+\.(?:jpe?g|png|webp)) Image Shared"[^>]*?ssk='5:[^']*?33:([A-Za-z0-9_-]+)-0-16'/gi;
    const datePattern = />\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4})\s*</;
    const photos = [];
    const seen = new Set();
    let match;
    while ((match = rowPattern.exec(html)) !== null) {
      if (!seen.has(match[2])) {
        seen.add(match[2]);
        const dateMatch = html.slice(rowPattern.lastIndex, rowPattern.lastIndex + 8000).match(datePattern);
        const uploadedAt = dateMatch ? new Date(`${dateMatch[1]} 12:00:00 UTC`).toISOString().slice(0, 10) : '';
        photos.push({ name: match[1], id: match[2], uploadedAt });
      }
    }

    photos.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || '') || b.name.localeCompare(a.name, undefined, { numeric: true }));
    return Response.json({ photos, configured: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
