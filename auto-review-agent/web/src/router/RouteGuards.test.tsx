import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminRoute, ProtectedRoute, PublicOnlyRoute } from './RouteGuards';

const useAuthMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

function renderRoute(ui: ReactNode, initialEntries = ['/dashboard']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route element={ui}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('RouteGuards', () => {
  afterEach(() => {
    useAuthMock.mockReset();
  });

  it('shows a loading message while auth state is resolving', () => {
    useAuthMock.mockReturnValue({ user: null, loading: true, isAdmin: false });

    renderRoute(<ProtectedRoute />, ['/protected']);

    expect(screen.getByText('Checking your session...')).toBeInTheDocument();
  });

  it('redirects anonymous users away from protected routes', () => {
    useAuthMock.mockReturnValue({ user: null, loading: false, isAdmin: false });

    renderRoute(<ProtectedRoute />, ['/protected']);

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects signed-in users away from public-only routes', () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false, isAdmin: false });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<div>Login Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('redirects non-admin users away from admin routes', () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false, isAdmin: false });

    renderRoute(<AdminRoute />, ['/protected']);

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
