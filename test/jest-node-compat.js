// Tests only. Node 25 removed `buffer.SlowBuffer`, which `buffer-equal-constant-time` (a dependency of
// jsonwebtoken) still reads when it loads, so any test importing the JWT module would crash there.
// Older Node versions, including the one the API runs on, still have it. This restores the name so the
// tests run on any Node; remove it once the dependency is updated.
const buffer = require('buffer');

if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = buffer.Buffer;
}
