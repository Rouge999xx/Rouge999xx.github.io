// Static checks for the portfolio pages: links resolve, assets exist, basic accessibility holds,
// and content rules are kept. Run with: node --test tests/*.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGES = ['index.html', 'flow-auto.html', 'healthnest.html'];
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const html = Object.fromEntries(PAGES.map(page => [page, read(page)]));

const ids = source => [...source.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const attrs = (source, name) => [...source.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map(match => match[1]);
const isExternal = url => /^(https?:|mailto:|tel:|data:|#)/.test(url);

test('every page has a language, title, description and viewport', () => {
  for (const [page, source] of Object.entries(html)) {
    assert.match(source, /<html lang="en">/, `${page}: lang`);
    assert.match(source, /<title>[^<]{10,}<\/title>/, `${page}: title`);
    assert.match(source, /<meta name="description" content="[^"]{40,}"/, `${page}: description`);
    assert.match(source, /<meta name="viewport"/, `${page}: viewport`);
  }
});

test('ids are unique on each page', () => {
  for (const [page, source] of Object.entries(html)) {
    const list = ids(source);
    const dupes = list.filter((id, index) => list.indexOf(id) !== index);
    assert.deepEqual(dupes, [], `${page}: duplicate ids`);
  }
});

test('in-page and cross-page anchors point at real targets', () => {
  for (const [page, source] of Object.entries(html)) {
    for (const href of attrs(source, 'href')) {
      if (/^(https?:|mailto:|tel:)/.test(href)) continue;
      const [file, hash] = href.split('#');
      const targetPage = file || page;
      assert.ok(PAGES.includes(targetPage) || fs.existsSync(path.join(ROOT, targetPage)), `${page}: ${href} (missing file)`);
      if (hash && PAGES.includes(targetPage)) {
        assert.ok(ids(html[targetPage]).includes(hash), `${page}: ${href} (no #${hash} in ${targetPage})`);
      }
    }
  }
});

test('local images, scripts, styles and videos exist', () => {
  for (const [page, source] of Object.entries(html)) {
    const refs = [
      ...attrs(source, 'src'),
      ...attrs(source, 'srcset').flatMap(set => set.split(',').map(part => part.trim().split(/\s+/)[0])),
      ...attrs(source, 'data-video'),
      ...attrs(source, 'data-play-video'),
      ...[...source.matchAll(/<link[^>]+href="([^"]+)"/g)].map(match => match[1])
    ].filter(url => url && !isExternal(url));
    for (const ref of refs) {
      assert.ok(fs.existsSync(path.join(ROOT, ref.split(/[?#]/)[0])), `${page}: ${ref} is missing`);
    }
  }
});

test('every image has alt text (empty only when decorative)', () => {
  for (const [page, source] of Object.entries(html)) {
    for (const tag of source.match(/<img\b[^>]*>/g) || []) {
      assert.match(tag, /\salt="/, `${page}: ${tag}`);
    }
  }
});

test('buttons and icon links have accessible names', () => {
  for (const [page, source] of Object.entries(html)) {
    for (const [, open, inner] of source.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
      const text = inner.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim();
      assert.ok(/aria-label="[^"]+"/.test(open) || text, `${page}: unnamed button ${open}`);
    }
    for (const [, open, inner] of source.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
      const text = inner.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim();
      assert.ok(/aria-label="[^"]+"/.test(open) || text, `${page}: unnamed link ${open}`);
    }
  }
});

test('new-tab links say so to screen readers', () => {
  for (const [page, source] of Object.entries(html)) {
    for (const [tag, open, inner] of source.matchAll(/<a\b([^>]*target="_blank"[^>]*)>([\s\S]*?)<\/a>/g)) {
      assert.ok(/new tab/i.test(open + inner), `${page}: ${tag.slice(0, 80)}`);
    }
  }
});

test('pages load the shared styles and scripts, with pinned CDN versions', () => {
  for (const [page, source] of Object.entries(html)) {
    for (const asset of ['style.css', 'main.js', 'motion.js']) assert.ok(source.includes(asset), `${page}: ${asset}`);
    for (const src of attrs(source, 'src').filter(url => url.startsWith('https://cdn.jsdelivr.net/npm/'))) {
      assert.match(src, /@\d+\.\d+\.\d+\//, `${page}: ${src} should pin an exact version`);
    }
    assert.doesNotMatch(source, /ragdoll|story\.js/, `${page}: removed scripts are still referenced`);
  }
});

test('only Carl’s own projects are listed', () => {
  const files = [...PAGES, 'main.js', 'motion.js', 'style.css', 'videos/README.md'];
  for (const file of files) {
    assert.doesNotMatch(read(file), /NurseDesk|Barangay/i, `${file} mentions a project that is not Carl's`);
  }
  assert.match(html['index.html'], /Cebu, Philippines/);
});

test('pages default to full motion and smooth scrolling; only the header switch turns it down', () => {
  for (const [page, source] of Object.entries(html)) {
    const head = source.slice(0, source.indexOf('</head>'));
    assert.match(head, /root\.dataset\.motion = saved === 'reduced' \? 'reduced' : 'full'/, `${page}: motion default`);
    assert.doesNotMatch(head, /prefers-reduced-motion/, `${page}: the OS setting should not switch smooth scrolling off`);
    assert.match(source, /id="motionToggle"/, `${page}: motion switch`);
  }
});

test('every page has the light/dark switch, defaults to navy and picks a theme before it paints', () => {
  for (const [page, source] of Object.entries(html)) {
    const head = source.slice(0, source.indexOf('</head>'));
    assert.match(head, /root\.dataset\.theme = theme/, `${page}: theme set in the head`);
    assert.match(head, /if \(theme !== 'light'\) theme = 'dark';/, `${page}: navy is the default`);
    assert.doesNotMatch(head, /prefers-color-scheme/, `${page}: the device setting does not pick the theme`);
    assert.match(source, /<button class="theme-toggle" id="themeToggle" type="button" aria-label="[^"]+">/, `${page}: theme switch`);
  }
  const css = read('style.css');
  assert.match(css, /:root\[data-theme="light"\] \{[\s\S]*?--bg: #f5f4f0;/, 'light tokens');
});

test('the work studio lists each project as a tab with its own panel, and keeps the 3D stage out of the reading order', () => {
  const page = html['index.html'];
  const tabs = [...page.matchAll(/<button class="studio-tab"[^>]*role="tab" id="([^"]+)" aria-controls="([^"]+)"/g)];
  assert.equal(tabs.length, 3, 'three projects in the studio');
  for (const [, tab, panel] of tabs) {
    assert.match(page, new RegExp(`role="tabpanel" id="${panel}" aria-labelledby="${tab}"`), `${tab} -> ${panel}`);
  }
  assert.equal((page.match(/class="orbit-item[ "]/g) || []).length, tabs.length, 'one window per project on the turntable');
  assert.match(page, /<div class="studio-stage" aria-hidden="true">/, 'the 3D stage is decorative');
  for (const target of ['flow-auto.html', 'healthnest.html']) assert.match(page, new RegExp(`<a class="button" href="${target}" data-studio-open>`), target);
  assert.match(page, /<dialog class="theater" id="theater"[^>]*data-video="videos\/intro.mp4"/, 'the intro plays in the theater');
});
