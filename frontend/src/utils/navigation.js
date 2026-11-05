/**
 * Returns a safe in-app path to go to after login.
 * Only same-site absolute paths are accepted, so a crafted link such as
 * /login?redirect=//evil.com or /login?redirect=https://evil.com cannot bounce the user off-site.
 */
export const getSafeRedirect = (target, fallback = '/') => {
  if (typeof target !== 'string' || target.length === 0) return fallback;
  if (!target.startsWith('/')) return fallback;
  if (target.startsWith('//') || target.startsWith('/\\')) return fallback;
  if (/[\r\n]/.test(target)) return fallback;
  // Do not bounce back into the auth pages.
  if (/^\/(login|register)(\/|\?|#|$)/.test(target)) return fallback;
  return target;
};

// Routes that require a signed-in user. Used to decide whether an expired session should
// send the visitor to the login page (public pages just keep working as a guest).
const PROTECTED_PREFIXES = ['/my-bookings', '/payment', '/admin'];

export const isProtectedPath = (pathname) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
