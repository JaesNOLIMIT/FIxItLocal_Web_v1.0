import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./lib/supabaseRest', () => ({
  loginWithPassword: jest.fn(),
  fetchCurrentUserProfile: jest.fn(),
  getCurrentAuthUser: jest.fn(async () => null),
  getValidAccessToken: jest.fn(async () => null),
  signOut: jest.fn(async () => undefined),
}));

test('renders login heading', async () => {
  render(<App />);
  const titles = await screen.findAllByText(/welcome back/i);
  expect(titles.length).toBeGreaterThan(0);
});
