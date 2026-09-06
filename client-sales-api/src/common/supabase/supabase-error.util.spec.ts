import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { throwIfSupabaseError } from './supabase-error.util.js';

function buildError(code: string, message = 'error'): PostgrestError {
  return { code, message, details: null, hint: null, name: 'PostgrestError' } as PostgrestError;
}

describe('throwIfSupabaseError', () => {
  it('does nothing when there is no error', () => {
    expect(() => throwIfSupabaseError(null)).not.toThrow();
    expect(() => throwIfSupabaseError(undefined)).not.toThrow();
  });

  it('maps PGRST116 to NotFoundException', () => {
    expect(() => throwIfSupabaseError(buildError('PGRST116'), { entityName: 'Client' })).toThrow(
      NotFoundException,
    );
  });

  it('maps 23505 to ConflictException', () => {
    expect(() => throwIfSupabaseError(buildError('23505'))).toThrow(ConflictException);
  });

  it('maps 23503 to BadRequestException', () => {
    expect(() => throwIfSupabaseError(buildError('23503'))).toThrow(BadRequestException);
  });

  it('maps 42501 to ForbiddenException', () => {
    expect(() => throwIfSupabaseError(buildError('42501'))).toThrow(ForbiddenException);
  });

  it('maps unknown codes to InternalServerErrorException', () => {
    expect(() => throwIfSupabaseError(buildError('99999'))).toThrow(InternalServerErrorException);
  });
});
