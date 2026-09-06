import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function buildHost(request: { method: string; url: string }) {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('AllExceptionsFilter', () => {
  it('formats an HttpException using its own status and message', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = buildHost({ method: 'GET', url: '/clients/unknown' });

    filter.catch(new NotFoundException('Client not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Client not found',
        path: '/clients/unknown',
      }),
    );
  });

  it('formats validation errors (array message) from BadRequestException', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = buildHost({ method: 'POST', url: '/clients' });

    filter.catch(new BadRequestException(['company_name should not be empty']), host);

    expect(response.status).toHaveBeenCalledWith(400);
    const [body] = response.json.mock.calls[0];
    expect(body.message).toEqual(['company_name should not be empty']);
  });

  it('masks unexpected errors as a generic 500', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = buildHost({ method: 'GET', url: '/dashboard' });

    filter.catch(new Error('unexpected DB failure with secrets'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    const [body] = response.json.mock.calls[0];
    expect(body.message).toBe('An unexpected error occurred.');
    expect(body.message).not.toContain('secrets');
  });
});
