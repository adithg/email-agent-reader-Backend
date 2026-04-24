import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveRequest,
  escalateRequest,
  rejectRequest,
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
