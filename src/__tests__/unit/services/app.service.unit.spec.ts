import { describe, expect, it } from 'vitest';
import { AppService } from '@/app.service';

describe('AppService', () => {
  it('returns health status', () => {
    expect(new AppService().getHealth()).toEqual({ status: 'ok' });
  });
});
