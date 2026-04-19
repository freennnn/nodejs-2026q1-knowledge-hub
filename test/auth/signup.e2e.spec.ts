import { validate } from 'uuid';
import { StatusCodes } from 'http-status-codes';
import { request } from '../lib';
import { authRoutes } from '../endpoints';

describe('Signup (e2e)', () => {
  const commonHeaders = { Accept: 'application/json' };

  it('should create a user with valid dto', async () => {
    const dto = {
      login: `signup-user-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      password: 'TEST_PASSWORD',
    };

    const response = await request
      .post(authRoutes.signup)
      .set(commonHeaders)
      .send(dto);

    const { id, login, role, createdAt, updatedAt } = response.body;
    expect(response.statusCode).toBe(StatusCodes.CREATED);
    expect(login).toBe(dto.login);
    expect(response.body).not.toHaveProperty('password');
    expect(validate(id)).toBe(true);
    expect(role).toBe('viewer');
    expect(typeof createdAt).toBe('number');
    expect(typeof updatedAt).toBe('number');
  });

  it('should respond with BAD_REQUEST when dto is invalid', async () => {
    const responses = await Promise.all([
      request.post(authRoutes.signup).set(commonHeaders).send({}),
      request
        .post(authRoutes.signup)
        .set(commonHeaders)
        .send({ login: 'TEST_LOGIN' }),
      request
        .post(authRoutes.signup)
        .set(commonHeaders)
        .send({ password: 'TEST_PASSWORD' }),
      request
        .post(authRoutes.signup)
        .set(commonHeaders)
        .send({ login: null, password: 12345 }),
    ]);

    expect(
      responses.every(
        ({ statusCode }) => statusCode === StatusCodes.BAD_REQUEST,
      ),
    ).toBe(true);
  });

  it('should respond with BAD_REQUEST when login is already taken', async () => {
    const dto = {
      login: `signup-duplicate-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      password: 'TEST_PASSWORD',
    };

    const firstResponse = await request
      .post(authRoutes.signup)
      .set(commonHeaders)
      .send(dto);
    expect(firstResponse.statusCode).toBe(StatusCodes.CREATED);

    const secondResponse = await request
      .post(authRoutes.signup)
      .set(commonHeaders)
      .send(dto);

    expect(secondResponse.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(secondResponse.body.message).toBe('Login is already taken');
  });
});
