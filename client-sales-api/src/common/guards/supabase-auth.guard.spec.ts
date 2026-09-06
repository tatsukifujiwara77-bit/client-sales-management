import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

const createClientMock = vi.fn();
vi.mock('@supabase/supabase-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@supabase/supabase-js')>();
  return { ...actual, createClient: (...args: unknown[]) => createClientMock(...args) };
});

function buildContext(request: Partial<AuthenticatedRequest>, handler = () => undefined): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function buildConfigService(): ConfigService {
  return {
    getOrThrow: (key: string) =>
      key === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'anon-key',
  } as unknown as ConfigService;
}

describe('SupabaseAuthGuard', () => {
  it('allows @Public() routes without a token', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(true) } as unknown as Reflector;
    const anonClient = { auth: { getUser: vi.fn() } } as any;
    const guard = new SupabaseAuthGuard(reflector, buildConfigService(), anonClient);

    const request: Partial<AuthenticatedRequest> = { headers: {} };
    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(anonClient.auth.getUser).not.toHaveBeenCalled();
  });

  it('rejects requests without an Authorization header', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector;
    const anonClient = { auth: { getUser: vi.fn() } } as any;
    const guard = new SupabaseAuthGuard(reflector, buildConfigService(), anonClient);

    const request: Partial<AuthenticatedRequest> = { headers: {} };
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an invalid/expired token', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector;
    const anonClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } }),
      },
    } as any;
    const guard = new SupabaseAuthGuard(reflector, buildConfigService(), anonClient);

    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: 'Bearer bad-token' },
    };
    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(UnauthorizedException);
  });

  it('self-heals a missing profile row (pending, is_active=false) and still rejects the request', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as unknown as Reflector;
    const anonClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'new@example.com', user_metadata: { full_name: '新規 太郎' } } },
          error: null,
        }),
      },
    } as any;

    const insert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const fromMock = vi.fn().mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
      insert,
    });
    createClientMock.mockReturnValue({ from: fromMock });

    const guard = new SupabaseAuthGuard(reflector, buildConfigService(), anonClient);
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: 'Bearer good-token' },
    };

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow('This account has been deactivated.');
    expect(insert).toHaveBeenCalledWith({
      id: 'user-1',
      full_name: '新規 太郎',
      role: 'sales_rep',
      is_active: false,
    });
  });
});
