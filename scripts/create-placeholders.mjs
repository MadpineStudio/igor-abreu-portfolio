import { mkdir, writeFile } from 'node:fs/promises';
const directory = new URL('../public/media/placeholders/', import.meta.url);
await mkdir(directory, { recursive: true });
const frame = (background, artwork, detail = false) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 950" fill="none"><defs>
<radialGradient id="bg"><stop stop-color="${background[0]}"/><stop offset="1" stop-color="${background[1]}"/></radialGradient>
<linearGradient id="metal" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="#f2f0e9"/><stop offset=".3" stop-color="#aaa9a1"/><stop offset=".48" stop-color="#eeeae1"/><stop offset=".6" stop-color="#696b65"/><stop offset="1" stop-color="#c6c7be"/></linearGradient>
<linearGradient id="dark" x2="1" y2=".4"><stop stop-color="#353b36"/><stop offset=".5" stop-color="#798078"/><stop offset="1" stop-color="#222823"/></linearGradient>
<linearGradient id="orange" x1=".1" x2="1" y2=".5"><stop stop-color="#fca16c"/><stop offset=".4" stop-color="#e77b43"/><stop offset="1" stop-color="#a64120"/></linearGradient>
<radialGradient id="ball" cx=".35" cy=".25"><stop stop-color="#f7f8ef"/><stop offset=".35" stop-color="#b9beb1"/><stop offset=".65" stop-color="#727c6c"/><stop offset="1" stop-color="#252e26"/></radialGradient>
<filter id="shadow"><feGaussianBlur stdDeviation="25"/></filter>
</defs><path fill="url(#bg)" d="M0 0h1200v950H0z"/><ellipse cx="620" cy="800" rx="260" ry="32" fill="#172017" opacity=".2" filter="url(#shadow)"/>
<g transform="${detail ? 'translate(-200 -250) scale(1.5)' : 'translate(0 0)'}">${artwork}</g></svg>`;
const atlas = `<g transform="translate(10 35)">
<path d="M330 799l29-142 144-69h185l137 69 39 142" fill="url(#dark)"/><path d="M350 791l38-115 118-64 29 174M846 791l-38-115-119-64-29 174" fill="url(#metal)"/>
<path d="M522 607l30-114h94l28 114-29 68h-93z" fill="#272f29"/><path d="M559 511l-20 91 30 63m66-154 20 91-30 63" stroke="url(#metal)" stroke-width="17"/><path d="M580 511v125m37-125v125" stroke="#e4e2d7" stroke-width="9"/>
<path d="M473 317q-6-120 126-139 132 19 126 139l-23 135-65 70h-76l-65-70z" fill="url(#metal)"/><path d="M599 184v335" stroke="#545c52" stroke-width="2" opacity=".5"/>
<path d="M493 325l50-21 42 27-43 37-48-10m211-33-50-21-42 27 43 37 48-10" fill="#303830"/>
<path d="M513 328l29-7 21 11-22 15-27-4m171-15-29-7-21 11 22 15 27-4" fill="#adb3a7"/>
<path d="M592 342l-14 70h40l-12-70" fill="#d7d9ce"/><path d="M554 458h90l-22 16h-46z" fill="#525b50"/>
<path d="M476 336h-22v88l36 20m231-108h22v88l-36 20" fill="url(#dark)"/>
<circle cx="430" cy="695" r="37" fill="#242d26"/><circle cx="430" cy="695" r="20" fill="url(#orange)"/><circle cx="772" cy="695" r="37" fill="#242d26"/><circle cx="772" cy="695" r="20" fill="url(#orange)"/>
<g stroke="#d88a56" stroke-width="2" opacity=".75"><ellipse cx="599" cy="385" rx="164" ry="185"/><ellipse cx="599" cy="607" rx="110" ry="30"/><path d="M432 185h334M599 148v60M399 695h64m-32-32v64M741 695h64m-32-32v64"/><circle cx="599" cy="607" r="8"/></g></g>`;
const kinetic = `<g transform="translate(40 -15) rotate(-12 600 500)">
<ellipse cx="624" cy="245" rx="68" ry="78" fill="url(#orange)" transform="rotate(16 624 245)"/>
<path d="M603 317l-14 39" stroke="#8d462b" stroke-width="34" stroke-linecap="round"/>
<path d="M595 374q-1 59-32 125" stroke="url(#orange)" stroke-width="118" stroke-linecap="round"/>
<circle cx="567" cy="527" r="52" fill="#b45b32"/>
<path d="M550 550l-100 100 18 135" stroke="url(#orange)" stroke-width="66" stroke-linecap="round" stroke-linejoin="round"/><circle cx="450" cy="650" r="28" fill="#b95730"/>
<path d="M591 552l99 84 101-37" stroke="url(#orange)" stroke-width="66" stroke-linecap="round" stroke-linejoin="round"/><circle cx="690" cy="636" r="28" fill="#b95730"/>
<path d="M558 372l-106-50-50-111" stroke="url(#orange)" stroke-width="47" stroke-linecap="round" stroke-linejoin="round"/><circle cx="453" cy="322" r="22" fill="#b95730"/>
<path d="M640 376l84 72 98-53" stroke="url(#orange)" stroke-width="47" stroke-linecap="round" stroke-linejoin="round"/><circle cx="724" cy="448" r="22" fill="#b95730"/>
<path d="M467 792l-45 24m376-218 20-33" stroke="#b15832" stroke-width="44" stroke-linecap="round"/>
<path d="M390 202l-7-30m445 219 26-17" stroke="url(#orange)" stroke-width="35" stroke-linecap="round"/>
</g><g stroke="#b36f46" stroke-width="1.5" opacity=".25"><path d="M327 560Q270 370 390 254M298 590Q217 367 367 219M828 499q59-4 100-50"/><circle cx="600" cy="475" r="340" stroke-dasharray="2 16"/></g>`;
const orbit = `<g transform="rotate(-28 600 470)"><ellipse cx="600" cy="470" rx="320" ry="129" stroke="#5c6659" stroke-width="18"/><ellipse cx="600" cy="470" rx="320" ry="129" stroke="url(#metal)" stroke-width="11"/></g>
<g transform="rotate(36 600 470)"><ellipse cx="600" cy="470" rx="282" ry="152" stroke="#404b40" stroke-width="29"/><ellipse cx="600" cy="470" rx="282" ry="152" stroke="url(#metal)" stroke-width="23"/></g>
<g transform="rotate(82 600 470)"><ellipse cx="600" cy="470" rx="310" ry="128" stroke="#465143" stroke-width="18"/><ellipse cx="600" cy="470" rx="310" ry="128" stroke="url(#metal)" stroke-width="13"/></g>
<circle cx="600" cy="470" r="144" fill="url(#ball)"/>
<g transform="rotate(-28 600 470)"><path d="M280 470a320 129 0 00640 0" stroke="url(#metal)" stroke-width="13"/></g>
<g transform="rotate(36 600 470)"><path d="M318 470a282 152 0 00564 0" stroke="url(#metal)" stroke-width="23"/></g>
<g transform="rotate(82 600 470)"><path d="M290 470a310 128 0 00620 0" stroke="url(#metal)" stroke-width="13"/></g>
<circle cx="854" cy="318" r="27" fill="url(#orange)"/><circle cx="393" cy="648" r="18" fill="url(#orange)"/>`;
for (const [name, colors, artwork] of [
  ['atlas', ['#9caaa0', '#697b70'], atlas],
  ['kinetic', ['#eac8a6', '#cba57d'], kinetic],
  ['orbit', ['#e5e7db', '#a9b29e'], orbit],
]) {
  await writeFile(new URL(`${name}.svg`, directory), frame(colors, artwork));
  await writeFile(new URL(`${name}-detail.svg`, directory), frame(colors, artwork, true));
}
console.log('Six original local SVG placeholders created.');
