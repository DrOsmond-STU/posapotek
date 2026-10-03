// Menggabungkan index.html + CSS + JS menjadi satu file HTML mandiri.
//   node scripts/build-single.mjs            -> dist/farmakasir-standalone.html (dokumen HTML lengkap)
//   node scripts/build-single.mjs --fragment -> dist/farmakasir-artifact.html (tanpa <html>/<head>/<body>, untuk hosting artifact)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fragment = process.argv.includes("--fragment");
let html = readFileSync(join(root, "index.html"), "utf8");

html = html.replace(/<link rel="stylesheet" href="(assets\/[^"]+)">/g, (_, p) => `<style>\n${readFileSync(join(root, p), "utf8")}\n</style>`);
html = html.replace(/<script src="(assets\/[^"]+)"><\/script>/g, (_, p) => `<script>\n${readFileSync(join(root, p), "utf8").replace(/<\/script/gi, "<\\/script")}\n</script>`);

if (fragment) {
  const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<meta charset[^>]*>/, "").replace(/<meta name="viewport"[^>]*>/, "").replace(title, "");
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  html = `${title}\n${head.trim()}\n${body.trim()}\n`;
}

mkdirSync(join(root, "dist"), { recursive: true });
const out = join(root, "dist", fragment ? "farmakasir-artifact.html" : "farmakasir-standalone.html");
writeFileSync(out, html);
console.log(`Ditulis: ${out} (${(html.length / 1024).toFixed(0)} KB)`);
