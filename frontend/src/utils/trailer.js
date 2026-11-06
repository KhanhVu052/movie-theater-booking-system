const YT_ID = /^[\w-]{11}$/;

export function getEmbedTrailerUrl(raw) {
  if (!raw) return '';
  let u;
  try { u = new URL(raw); } catch { return ''; }
  if (u.protocol !== 'https:') return '';
  const host = u.hostname.replace(/^www\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'm.youtube.com') {
    id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean)[1];
  }
  return id && YT_ID.test(id)
    ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
    : '';
}

