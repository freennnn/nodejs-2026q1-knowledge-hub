import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ids } from '../fixtures';

describe('ParseUUIDPipe', () => {
  const pipe = new ParseUUIDPipe({ version: '4' });

  it('passes through valid v4 UUIDs', async () => {
    await expect(pipe.transform(ids.article, { type: 'param', data: 'id' })).resolves.toBe(
      ids.article,
    );
  });

  it('throws BadRequestException for malformed UUIDs', async () => {
    await expect(
      pipe.transform('not-a-uuid', { type: 'param', data: 'id' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
