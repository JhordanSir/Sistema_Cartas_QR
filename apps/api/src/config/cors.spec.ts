import { parseCorsOrigins } from './cors.js';

describe('parseCorsOrigins', () => {
  it('returns trimmed unique origins', () => {
    const origins = parseCorsOrigins(
      'http://localhost:3000, https://menu.example.com, http://localhost:3000',
    );

    expect(origins).toEqual([
      'http://localhost:3000',
      'https://menu.example.com',
    ]);
  });

  it('ignores empty entries', () => {
    expect(parseCorsOrigins('http://localhost:3000, ,')).toEqual([
      'http://localhost:3000',
    ]);
  });
});
