import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubmitRequestPage from './SubmitRequestPage';

const submitRequestViaEmailMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../hooks/useSupabase', () => ({
  submitRequestViaEmail: (...args: unknown[]) => submitRequestViaEmailMock(...args),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

describe('SubmitRequestPage', () => {
  beforeEach(() => {
    submitRequestViaEmailMock.mockReset();
    useAuthMock.mockReturnValue({
      user: { email: 'student@example.edu' },
      profile: { full_name: 'Student User' },
    });
  });

  it('submits the request payload and navigates to My Requests on success', async () => {
    submitRequestViaEmailMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/submit']}>
        <Routes>
          <Route path="/submit" element={<SubmitRequestPage />} />
          <Route path="/my-requests" element={<div>My Requests Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/conference room/i), 'Budget review for team event');
    await user.selectOptions(screen.getByDisplayValue('Room Booking'), 'Budget Approval');
    await user.selectOptions(screen.getByDisplayValue('Normal'), 'high');
    await user.type(screen.getByPlaceholderText(/marketing, engineering/i), 'Student Affairs');
    await user.type(screen.getByPlaceholderText(/provide detailed information/i), 'Need approval for food budget.');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(submitRequestViaEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'student@example.edu',
          subject: '[Budget Approval] Budget review for team event',
        })
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText('My Requests Page')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('shows a visible error when submission fails', async () => {
    submitRequestViaEmailMock.mockRejectedValue(new Error('Submission failed'));
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/submit']}>
        <Routes>
          <Route path="/submit" element={<SubmitRequestPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/conference room/i), 'Access request');
    await user.type(screen.getByPlaceholderText(/marketing, engineering/i), 'IT');
    await user.type(screen.getByPlaceholderText(/provide detailed information/i), 'Please grant access.');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    expect(await screen.findByText('Submission failed')).toBeInTheDocument();
  });
});
