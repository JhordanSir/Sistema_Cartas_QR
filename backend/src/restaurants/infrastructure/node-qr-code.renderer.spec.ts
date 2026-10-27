import { NodeQrCodeRenderer } from './node-qr-code.renderer.js';

describe('NodeQrCodeRenderer', () => {
  const payload = 'https://cartas.example.com/bistro-sirio';

  it('renders a valid PNG signature', async () => {
    const bytes = await new NodeQrCodeRenderer().render(payload, 'png');
    expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  }, 15_000);

  it('renders a self-contained SVG document', async () => {
    const bytes = await new NodeQrCodeRenderer().render(payload, 'svg');
    const svg = Buffer.from(bytes).toString('utf8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('#17271E');
  });

  it('is deterministic when materializing a legacy QR once', async () => {
    const renderer = new NodeQrCodeRenderer();
    const first = await renderer.render(payload, 'svg');
    const second = await renderer.render(payload, 'svg');

    expect(Buffer.from(first)).toEqual(Buffer.from(second));
  });
});
