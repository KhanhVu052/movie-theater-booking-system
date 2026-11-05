import { describe, it, expect } from 'vitest';
import { getSafeRedirect, isProtectedPath } from '../utils/navigation';

describe('Navigation Utility', () => {
  describe('getSafeRedirect', () => {
    it('accepts same-site paths, including query strings', () => {
      expect(getSafeRedirect('/booking/12')).toBe('/booking/12');
      expect(getSafeRedirect('/my-bookings')).toBe('/my-bookings');
      expect(getSafeRedirect('/payment/5?x=1')).toBe('/payment/5?x=1');
    });

    it('falls back to / when missing or empty', () => {
      expect(getSafeRedirect(null)).toBe('/');
      expect(getSafeRedirect(undefined)).toBe('/');
      expect(getSafeRedirect('')).toBe('/');
    });

    it('blocks open redirects to other sites', () => {
      expect(getSafeRedirect('//evil.com')).toBe('/');
      expect(getSafeRedirect('/\\evil.com')).toBe('/');
      expect(getSafeRedirect('https://evil.com')).toBe('/');
      expect(getSafeRedirect('javascript:alert(1)')).toBe('/');
    });

    it('does not loop back to the auth pages', () => {
      expect(getSafeRedirect('/login')).toBe('/');
      expect(getSafeRedirect('/login?redirect=/admin')).toBe('/');
      expect(getSafeRedirect('/register')).toBe('/');
    });

    it('accepts a custom fallback', () => {
      expect(getSafeRedirect('//evil.com', '/home')).toBe('/home');
    });
  });

  describe('isProtectedPath', () => {
    it('flags pages that need a signed-in user', () => {
      expect(isProtectedPath('/my-bookings')).toBe(true);
      expect(isProtectedPath('/payment/42')).toBe(true);
      expect(isProtectedPath('/payment/result')).toBe(true);
      expect(isProtectedPath('/admin')).toBe(true);
    });

    it('leaves public pages alone', () => {
      expect(isProtectedPath('/')).toBe(false);
      expect(isProtectedPath('/movies/3')).toBe(false);
      expect(isProtectedPath('/login')).toBe(false);
      expect(isProtectedPath('/administrator')).toBe(false);
    });
  });
});
