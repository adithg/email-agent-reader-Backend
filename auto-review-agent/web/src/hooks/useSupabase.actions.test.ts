import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addRequestNote,
  approveRequest,
  escalateRequest,
  rejectRequest,
  requestMoreInfo,
  submitRequestViaEmail,
} from './useSupabase';

const {
  updateEqMock,
  insertMock,
  updateMock,
  fromMock,
} = vi.hoisted(() => {
  const updateEqMock = vi.fn();
  const insertMock = vi.fn();
  const updateMock = vi.fn(() => ({ eq: updateEqMock }));
  const fromMock = vi.fn((table: string) => {
    if (table === 'requests') {
      return { update: updateMock };
    }

    if (table === 'activity_log' || table === 'emails') {
      return { insert: insertMock };
    }

    return {};
  });

  return {
    updateEqMock,
    insertMock,
    updateMock,
    fromMock,
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('request actions', () => {
  beforeEach(() => {
    fromMock.mockClear();
    updateMock.mockClear();
    updateEqMock.mockClear();
    insertMock.mockClear();
    updateEqMock.mockResolvedValue({ error: null });
    insertMock.mockResolvedValue({ error: null });
  });

  it('approves a request and writes an audit log entry', async () => {
    await approveRequest(42, 'Looks good', { id: 'admin-1', name: 'Admin User' });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        admin_notes: 'Looks good',
        reviewed_by: 'admin-1',
      })
    );
    expect(updateEqMock).toHaveBeenCalledWith('id', 42);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: 42,
        action: 'approved',
        actor_id: 'admin-1',
        actor_name: 'Admin User',
        notes: 'Looks good',
      })
    );
  });

  it('does not write an audit log when a request update fails', async () => {
    updateEqMock.mockResolvedValueOnce({ error: { message: 'update failed' } });

    const result = await rejectRequest(5, 'Missing details', {
      id: 'admin-1',
      name: 'Admin User',
    });

    expect(result.error).toEqual({ message: 'update failed' });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('escalates a request and records the escalation in the log', async () => {
    await escalateRequest(7, 'Need another approver', {
      id: 'admin-2',
      name: 'Escalation Admin',
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'escalated',
        reviewed_by: 'admin-2',
      })
    );
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'escalated',
        actor_name: 'Escalation Admin',
      })
    );
  });

  it('marks a request as info requested and records the follow-up note', async () => {
    await requestMoreInfo(9, 'Please attach the missing invoice.', {
      id: 'admin-3',
      name: 'Follow-up Admin',
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'info_requested',
        reviewed_by: 'admin-3',
      })
    );
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'info_requested',
        notes: 'Please attach the missing invoice.',
      })
    );
  });

  it('adds a request note without changing the request status', async () => {
    await addRequestNote(11, 'Verified policy exception with supervisor.', {
      id: 'admin-4',
      name: 'Review Admin',
    }, 'Stored note text');

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_notes: 'Stored note text',
        reviewed_by: 'admin-4',
      })
    );
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: 11,
        action: 'note_added',
        notes: 'Verified policy exception with supervisor.',
      })
    );
  });

  it('falls back to pending when info_requested status is blocked by older DB constraints', async () => {
    updateEqMock
      .mockResolvedValueOnce({ error: { code: '23514', message: 'violates check constraint "requests_status_check"' } })
      .mockResolvedValueOnce({ error: null });

    await requestMoreInfo(15, 'Need a clearer business justification.', {
      id: 'admin-5',
      name: 'Compatibility Admin',
    });

    expect(updateMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        status: 'info_requested',
      })
    );
    expect(updateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: 'pending',
      })
    );
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'info_requested',
        request_id: 15,
      })
    );
  });

  it('falls back to reviewed action when note_added is blocked by older activity log constraints', async () => {
    insertMock
      .mockResolvedValueOnce({ error: { code: '23514', message: 'violates check constraint "activity_log_action_check"' } })
      .mockResolvedValueOnce({ error: null });

    await addRequestNote(20, 'Added extra context for audit.', {
      id: 'admin-6',
      name: 'Audit Admin',
    });

    expect(insertMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: 'note_added',
        request_id: 20,
      })
    );
    expect(insertMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: 'reviewed',
        request_id: 20,
      })
    );
  });

  it('submits a request through the emails table', async () => {
    await submitRequestViaEmail({
      from: 'student@example.edu',
      subject: '[IT Access] Request access',
      body: 'Please grant me access.',
    });

    expect(fromMock).toHaveBeenCalledWith('emails');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sender: 'student@example.edu',
        subject: '[IT Access] Request access',
        body: 'Please grant me access.',
        read: false,
      })
    );
  });
});
