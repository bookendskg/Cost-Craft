import { readFileSync, writeFileSync } from "node:fs";
const brands = ["capiche", "aiko", "bookends"];
let out = "// Brand logos embedded as base64 data URIs so the PDF always has them\n";
out += "// (a runtime fetch of /brands/*.png is unreliable behind the SPA rewrite / SW).\n";
out += "// Regenerate: node scripts/gen-brand-logos.mjs (reads public/brands/*.png).\n\n";
out += "export const BRAND_LOGOS: Record<string, string> = {\n";
for (const b of brands) {
  const buf = readFileSync(`public/brands/${b}.png`);
  out += `  ${b}: "data:image/png;base64,${buf.toString("base64")}",\n`;
}
out += "};\n";
writeFileSync("src/features/reports/brandLogos.ts", out);
console.log("wrote brandLogos.ts");
