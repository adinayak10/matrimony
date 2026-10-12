'use strict';
// utils/jsonLd.js: nothing that reaches a <script> block may close it or break
// the parse (D0.2).
const test = require('node:test');
const assert = require('node:assert/strict');
const { safeJson, jsonLd } = require('../utils/jsonLd');

test('safeJson neutralises </script>', () => {
  const out = safeJson({ name: 'Pune</script><script>alert(1)</script>' });
  assert.ok(!out.includes('</script>'), 'closing tag survived');
  assert.ok(!out.includes('<'), 'raw < survived');
  assert.ok(!out.includes('>'), 'raw > survived');
  assert.deepEqual(JSON.parse(out), { name: 'Pune</script><script>alert(1)</script>' });
});

test('safeJson neutralises U+2028 and U+2029', () => {
  const out = safeJson('a b c');
  assert.ok(!out.includes(' '));
  assert.ok(!out.includes(' '));
  assert.equal(out, '"a\\u2028b\\u2029c"');
  assert.equal(JSON.parse(out), 'a b c');
});

test('safeJson escapes & and handles undefined', () => {
  assert.equal(safeJson('a&b'), '"a\\u0026b"');
  assert.equal(safeJson(undefined), 'null');
  assert.equal(safeJson({ a: [1, 'x<y'] }), '{"a":[1,"x\\u003cy"]}');
});

test('jsonLd wraps in a ld+json script and skips null', () => {
  const html = jsonLd({ '@type': 'Thing', name: '</script>' });
  assert.ok(html.startsWith('<script type="application/ld+json">'));
  assert.ok(html.endsWith('</script>'));
  assert.equal(html.split('</script>').length, 2, 'exactly one closing tag');
  assert.equal(jsonLd(null), '');
  assert.equal(jsonLd(undefined), '');
});
