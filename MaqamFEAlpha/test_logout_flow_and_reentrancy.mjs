import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mock browser globals for Node test environment
globalThis.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] ?? null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

globalThis.sessionStorage = {
  _store: {},
  getItem(k) { return this._store[k] ?? null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

class MockCustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}
globalThis.CustomEvent = MockCustomEvent;

const eventListeners = new Map();
globalThis.window = {
  addEventListener(event, listener) {
    if (!eventListeners.has(event)) eventListeners.set(event, new Set());
    eventListeners.get(event).add(listener);
  },
  removeEventListener(event, listener) {
    if (eventListeners.has(event)) eventListeners.get(event).delete(listener);
  },
  dispatchEvent(event) {
    const listeners = eventListeners.get(event.type);
    if (!listeners) return true;
    for (const listener of listeners) {
      listener(event);
    }
    return true;
  },
  matchMedia: () => ({ matches: false }),
};

globalThis.document = {
  documentElement: {
    _attrs: {},
    classList: {
      _classes: new Set(),
      toggle(cls, force) {
        if (force !== undefined) {
          force ? this._classes.add(cls) : this._classes.delete(cls);
        } else {
          this._classes.has(cls) ? this._classes.delete(cls) : this._classes.add(cls);
        }
      },
      add(cls) { this._classes.add(cls); },
      remove(cls) { this._classes.delete(cls); },
      contains(cls) { return this._classes.has(cls); },
    },
    style: {},
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k] || null; },
  }
};

describe('Logout & Re-entrancy Protection Verification', () => {
  it('1. applyTheme guards against redundant dispatches and does not throw', async () => {
    const { applyTheme } = await import('./src/utils/theme.js');
    let themeChangeCount = 0;
    const onThemeChange = () => {
      themeChangeCount++;
    };
    window.addEventListener('maqam:theme-changed', onThemeChange);

    // Initial theme apply
    applyTheme('dark', { animate: false });
    assert.equal(document.documentElement.getAttribute('data-theme'), 'dark');
    assert.equal(themeChangeCount, 1);

    // Re-applying same theme without animation should be a no-op
    applyTheme('dark', { animate: false });
    assert.equal(themeChangeCount, 1, 'Duplicate theme apply should not trigger additional dispatches');

    // Switching to light theme
    applyTheme('light', { animate: false });
    assert.equal(document.documentElement.getAttribute('data-theme'), 'light');
    assert.equal(themeChangeCount, 2);

    // Calling again with light theme
    applyTheme('light', { animate: false });
    assert.equal(themeChangeCount, 2, 'Redundant light theme apply should be guarded');

    window.removeEventListener('maqam:theme-changed', onThemeChange);
  });

  it('2. tokenService.clearAll and authSession.clear prevent infinite re-entrant recursion', async () => {
    const { tokenService, AUTH_STATUS } = await import('./src/admin/services/tokenService.js');
    const { authSession } = await import('./src/services/authSession.js');

    // Simulate an authenticated session
    tokenService.setAccessToken('mock-token-123');
    tokenService.setUserProfile({ name: 'Test User' });
    tokenService.setAuthStatus(AUTH_STATUS.AUTHENTICATED);

    let sessionExpiredCount = 0;

    // Simulate listener that tries to call authSession.clear() recursively
    const recursiveListener = () => {
      sessionExpiredCount++;
      // Attempt recursive clearing inside event handler
      authSession.clear();
      tokenService.clearAll();
    };

    window.addEventListener('maqam:session-expired', recursiveListener);

    // Call clear
    authSession.clear();

    // Drain microtasks to allow asynchronous dispatch
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Must not throw RangeError: Maximum call stack size exceeded
    assert.ok(!tokenService.getAccessToken());
    assert.equal(tokenService.getAuthStatus(), AUTH_STATUS.UNAUTHENTICATED);
    assert.equal(sessionExpiredCount, 1, 'Event should only fire once without recursion');

    // Calling clearAll when already unauthenticated must not fire additional events
    tokenService.clearAll();
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(sessionExpiredCount, 1, 'Subsequent clear on unauthenticated session should not fire event');

    window.removeEventListener('maqam:session-expired', recursiveListener);
  });

  it('3. Repeated sequential calls to authSession.clear and tokenService.clearAll do not error', async () => {
    const { tokenService } = await import('./src/admin/services/tokenService.js');
    const { authSession } = await import('./src/services/authSession.js');

    assert.doesNotThrow(() => {
      authSession.clear();
      authSession.clear();
      tokenService.clearAll();
      tokenService.clearAll();
    });
  });
});
