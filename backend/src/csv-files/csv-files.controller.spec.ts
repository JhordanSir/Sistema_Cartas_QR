import { BadRequestException, NotFoundException } from '@nestjs/common';

import { AuthRole } from '../auth/domain/auth-role.js';
import type { AuthPrincipal } from '../auth/domain/auth.types.js';
import { RecordingResponse, asResponse } from '../testing/recording-response.js';
import type {
  GetRestaurantCsv,
  OpenRestaurantCsv,
  SaveRestaurantCsv,
} from './application/use-cases/csv-file.use-cases.js';
import { CsvFilesController } from './csv-files.controller.js';
import { CsvFileApplicationError } from './domain/csv-file.errors.js';

const RESTAURANT_ID = '33333333-3333-4333-8333-333333333333';
const principal: AuthPrincipal = {
  accountId: '44444444-4444-4444-8444-444444444444',
  email: 'owner@example.com',
  role: AuthRole.OWNER,
  sessionId: '55555555-5555-4555-8555-555555555555',
};
const info = { originalName: 'carta.csv', sizeBytes: 12, uploadedAt: '2026-10-27T15:00:00.000Z' };

function controller(overrides: {
  open?: OpenRestaurantCsv['execute'];
  save?: SaveRestaurantCsv['execute'];
}): CsvFilesController {
  return new CsvFilesController(
    { execute: overrides.save ?? jest.fn() } as unknown as SaveRestaurantCsv,
    { execute: jest.fn() } as unknown as GetRestaurantCsv,
    { execute: overrides.open ?? jest.fn() } as unknown as OpenRestaurantCsv,
  );
}

describe('CsvFilesController', () => {
  it('sends the saved CSV as raw text, unbuffered, without claiming an encoding', async () => {
    const response = new RecordingResponse();
    async function* content(): AsyncGenerator<Uint8Array> {
      yield await Promise.resolve(new TextEncoder().encode('nombre;precio\n'));
      yield await Promise.resolve(new TextEncoder().encode('Ceviche;35\n'));
    }

    await controller({ open: () => Promise.resolve({ content: content(), info }) }).content(
      principal,
      RESTAURANT_ID,
      asResponse(response),
    );

    expect(response.statusCode).toBe(200);
    expect(Object.fromEntries(response.headers)).toEqual({
      'cache-control': 'no-store, no-transform',
      'content-length': '12',
      'content-type': 'text/csv',
      'x-accel-buffering': 'no',
    });
    expect(response.body).toBe('nombre;precio\nCeviche;35\n');
  });

  it('answers 404 before writing anything when there is no saved CSV', async () => {
    const response = new RecordingResponse();
    const open = (): Promise<never> =>
      Promise.reject(new CsvFileApplicationError('CSV_FILE_NOT_FOUND', 'No CSV.'));

    await expect(controller({ open }).content(principal, RESTAURANT_ID, asResponse(response))).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(response.chunks).toEqual([]);
  });

  it('passes the upload on and maps a refused file to 400', async () => {
    const save = jest.fn().mockRejectedValue(new CsvFileApplicationError('CSV_FILE_INVALID', 'Not a CSV.'));

    await expect(
      controller({ save }).save(principal, RESTAURANT_ID, { buffer: Buffer.from('x'), originalname: 'foto.png' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(save).toHaveBeenCalledWith({
      bytes: Buffer.from('x'),
      originalName: 'foto.png',
      principal,
      restaurantId: RESTAURANT_ID,
    });
  });
});
