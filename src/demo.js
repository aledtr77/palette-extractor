// What the Demo button loads. An SVG built here rather than a bundled photo, so
// pressing Demo costs no network request and the palette it produces is known in
// advance: a teal field, two warm circles and a light card.

const DEMO_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <rect width="1200" height="800" fill="#111827"/>
    <rect x="0" y="0" width="680" height="800" fill="#0f766e"/>
    <circle cx="770" cy="235" r="190" fill="#f59e0b"/>
    <circle cx="920" cy="520" r="230" fill="#e11d48"/>
    <rect x="170" y="155" width="380" height="490" rx="72" fill="#f8fafc"/>
    <rect x="235" y="220" width="250" height="62" rx="31" fill="#0ea5e9"/>
    <rect x="235" y="336" width="190" height="38" rx="19" fill="#334155"/>
    <rect x="235" y="410" width="255" height="38" rx="19" fill="#94a3b8"/>
  </svg>
`;

export function createDemoImage() {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DEMO_SVG)}`;
}
