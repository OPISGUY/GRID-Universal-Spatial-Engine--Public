/**
 * Password gate for the promoter brief.
 *
 * GitHub Pages is static, so there is no server to check a password against.
 * A gate that hides content with CSS or an `if` is worthless — the text is in
 * the page and anyone can read it from view-source.
 *
 * So the brief is not in the page. What ships is AES-256-GCM ciphertext; the
 * password derives the key (PBKDF2-SHA256), and the browser decrypts in place.
 * Without the password there is nothing to read, and GCM's auth tag is what
 * tells us the password was wrong — we never store or compare a hash.
 *
 * What this is NOT: per-person access. One shared password, so it is only as
 * private as the least careful person you send it to, and rotating it means
 * rebuilding the page. It keeps the brief off search engines and out of casual
 * hands. Treat it as a lock on a door, not a safe.
 *
 * Requires a secure context (https, or localhost) for window.crypto.subtle —
 * GitHub Pages is https, so this holds in production.
 */
const PBKDF2_ITERATIONS = 310000;

const $ = (id) => document.getElementById(id);
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function unlock(password, payload) {
  const salt = b64(payload.salt);
  const iv = b64(payload.iv);
  const data = b64(payload.ct);

  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: payload.iterations ?? PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  // Throws if the tag does not verify — i.e. wrong password.
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plain);
}

function boot() {
  const form = $('gateform');
  const input = $('pw');
  const msg = $('msg');
  const gate = $('gatewrap');
  const out = $('brief');

  if (!globalThis.crypto?.subtle) {
    msg.className = 'msg err';
    msg.textContent =
      'This page needs a secure connection (https) to decrypt. Open it over https and try again.';
    return;
  }

  const payload = JSON.parse($('payload').textContent);

  const reveal = (html) => {
    out.innerHTML = html;
    gate.hidden = true;
    out.hidden = false;
    document.title = 'Promoter brief — GRID';
    scrollTo(0, 0);
  };

  // A correct password survives a refresh for this tab only; never persisted.
  const cached = sessionStorage.getItem('grid.pw');
  if (cached) {
    unlock(cached, payload).then(reveal).catch(() => sessionStorage.removeItem('grid.pw'));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = input.value.trim();
    if (!pw) return;
    msg.className = 'msg';
    msg.textContent = 'Checking…';
    try {
      const html = await unlock(pw, payload);
      try { sessionStorage.setItem('grid.pw', pw); } catch { /* private mode */ }
      reveal(html);
    } catch {
      msg.className = 'msg err';
      msg.textContent = 'That password does not open this page.';
      input.select();
    }
  });
}

boot();
