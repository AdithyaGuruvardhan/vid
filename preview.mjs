// Live preview with a scrubber: node preview.mjs [port]
import { serve } from './lib/server.mjs';

const { url } = await serve(process.cwd(), Number(process.argv[2] ?? 5173));
console.log(`Preview:  ${url}/index.html            (space = play, ←/→ = step a frame)`);
console.log(`Formats:  ${url}/index.html?format=1x1   ${url}/index.html?format=16x9`);
console.log(`Jump to:  ${url}/index.html?t=6.4`);
