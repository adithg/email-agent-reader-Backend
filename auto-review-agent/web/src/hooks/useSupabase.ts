import { useCallback, useEffect, useState } from 'react';
import { ActivityLog, Request, supabase } from '../lib/supabase';
import { Room, RoomBooking } from '../lib/supabase';

const DEFAULT_PAGE_SIZE = 10;

interface AccessScope {
  isAdmin?: boolean;
  requesterEmail?: string | null;
}

interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

interface RequestsQueryOptions extends PaginationOptions, AccessScope {
  search?: string;
  status?: string;
  riskLevel?: string;
  statuses?: Request['status'][];
}

interface ActivityLogQueryOptions extends PaginationOptions {
  search?: string;
  action?: string;
  date?: string;
  requestId?: number | null;
  enabled?: boolean;
}

interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  pageCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface DashboardStats {
  totalRequests: number;
  autoApproved: number;
  pendingReview: number;
  escalated: number;
  approved: number;
  rejected: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface ActionActor {
  id?: string | null;
  name: string;
}

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

const EMPTY_STATS: DashboardStats = {
  totalRequests: 0,
  autoApproved: 0,
  pendingReview: 0,
  escalated: 0,
  approved: 0,
  rejected: 0,
  riskDistribution: {
    low: 0,
    medium: 0,
    high: 0,
  },
};

function isCheckConstraintError(error: SupabaseErrorLike | null | undefined) {
  return error?.code === '23514';
}

async function insertActivityLogWithFallback(
  payload: {
    request_id: number;
    action: string;
    actor_id: string | null;
    actor_name: string;
    notes: string;
  },
  fallbackAction?: string,
) {
  const { error } = await supabase.from('activity_log').insert(payload);

  if (!error || !fallbackAction || !isCheckConstraintError(error)) {
    return { error };
  }

  return supabase.from('activity_log').insert({
    ...payload,
    action: fallbackAction,
  });
}

function normalizeSearchTerm(term?: string) {
  return term?.trim().replace(/[%_]/g, '').replace(/,/g, ' ') ?? '';
}

function applyRequestAccessScope<TQuery>(query: TQuery, access: AccessScope) {
  if (access.isAdmin || !access.requesterEmail) {
    return query;
  }

  return (query as any).eq('requester_email', access.requesterEmail) as TQuery;
}

function applyRequestFilters<TQuery>(query: TQuery, options: RequestsQueryOptions) {
  let nextQuery = applyRequestAccessScope(query, options);

  if (options.statuses?.length) {
    nextQuery = (nextQuery as any).in('status', options.statuses) as TQuery;
  }

  if (options.status && options.status !== 'all') {
    nextQuery = (nextQuery as any).eq('status', options.status) as TQuery;
  }

  if (options.riskLevel && options.riskLevel !== 'all') {
    nextQuery = (nextQuery as any).eq('risk_level', options.riskLevel) as TQuery;
  }

  const searchTerm = normalizeSearchTerm(options.search);
  if (searchTerm) {
    nextQuery = (nextQuery as any).or(
      [
        `title.ilike.%${searchTerm}%`,
        `requester_name.ilike.%${searchTerm}%`,
        `requester_email.ilike.%${searchTerm}%`,
        `category.ilike.%${searchTerm}%`,
        `status.ilike.%${searchTerm}%`,
        `ai_summary.ilike.%${searchTerm}%`,
      ].join(',')
    ) as TQuery;
  }

  return nextQuery;
}

async function fetchCount(
  access: AccessScope,
  options: {
    status?: Request['status'];
    statuses?: Request['status'][];
    riskLevel?: NonNullable<Request['risk_level']>;
  } = {}
) {
  let query = supabase.from('requests').select('id', { count: 'exact', head: true });
  query = applyRequestAccessScope(query, access);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.statuses?.length) {
    query = query.in('status', options.statuses);
  }

  if (options.riskLevel) {
    query = query.eq('risk_level', options.riskLevel);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export function useRequests(options: RequestsQueryOptions = {}): PaginatedResult<Request> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const [requests, setRequests] = useState<Request[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!options.isAdmin && !options.requesterEmail) {
      setRequests([]);
      setTotalCount(0);
      setPageCount(0);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    let query = supabase.from('requests').select('*', { count: 'exact' });
    query = applyRequestFilters(query, options);
    query = query.order('submitted_at', { ascending: false }).range(start, end);

    const { data, error: fetchError, count } = await query;

    if (fetchError) {
      setRequests([]);
      setTotalCount(0);
      setPageCount(0);
      setError(fetchError.message);
    } else {
      const safeCount = count ?? 0;
      setRequests(data ?? []);
      setTotalCount(safeCount);
      setPageCount(Math.max(1, Math.ceil(safeCount / pageSize)));
    }

    setLoading(false);
  }, [
    options.isAdmin,
    options.page,
    options.pageSize,
    options.requesterEmail,
    options.riskLevel,
    options.search,
    options.status,
    options.statuses,
    page,
    pageSize,
  ]);

  useEffect(() => {
    void fetch();

    const channel = supabase
      .channel(`requests-changes-${options.isAdmin ? 'admin' : options.requesterEmail ?? 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        void fetch();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetch, options.isAdmin, options.requesterEmail]);

  return {
    data: requests,
    totalCount,
    pageCount,
    loading,
    error,
    refetch: fetch,
  };
}

export function useRequest(
  id: string | number | undefined,
  access: AccessScope = {}
) {
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) {
      setRequest(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!access.isAdmin && !access.requesterEmail) {
      setRequest(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let query = supabase.from('requests').select('*').eq('id', id);
    query = applyRequestAccessScope(query, access);

    const { data, error: fetchError } = await query.single();

    if (fetchError) {
      setRequest(null);
      setError(fetchError.message);
    } else {
      setRequest(data);
    }

    setLoading(false);
  }, [access.isAdmin, access.requesterEmail, id]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { request, loading, error, refetch: fetch };
}

export function useMyRequests(options: PaginationOptions & { requesterEmail?: string | null }) {
  return useRequests({
    ...options,
    requesterEmail: options.requesterEmail,
    isAdmin: false,
  });
}

export function useDashboardStats(access: AccessScope = {}) {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!access.isAdmin && !access.requesterEmail) {
      setStats(EMPTY_STATS);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        totalRequests,
        autoApproved,
        pendingReview,
        escalated,
        approved,
        rejected,
        low,
        medium,
        high,
      ] = await Promise.all([
        fetchCount(access),
        fetchCount(access, { status: 'auto_approved' }),
        fetchCount(access, { statuses: ['pending', 'info_requested'] }),
        fetchCount(access, { status: 'escalated' }),
        fetchCount(access, { status: 'approved' }),
        fetchCount(access, { status: 'rejected' }),
        fetchCount(access, { riskLevel: 'low' }),
        fetchCount(access, { riskLevel: 'medium' }),
        fetchCount(access, { riskLevel: 'high' }),
      ]);

      setStats({
        totalRequests,
        autoApproved,
        pendingReview,
        escalated,
        approved,
        rejected,
        riskDistribution: { low, medium, high },
      });
    } catch (err) {
      setStats(EMPTY_STATS);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard stats.');
    } finally {
      setLoading(false);
    }
  }, [access.isAdmin, access.requesterEmail]);

  useEffect(() => {
    void fetch();

    const channel = supabase
      .channel(`dashboard-stats-${access.isAdmin ? 'admin' : access.requesterEmail ?? 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        void fetch();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [access.isAdmin, access.requesterEmail, fetch]);

  return { stats, loading, error, refetch: fetch };
}

export function useActivityLog(
  options: ActivityLogQueryOptions = {}
): PaginatedResult<ActivityLog> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (options.enabled === false) {
      setLogs([]);
      setTotalCount(0);
      setPageCount(0);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    let query = supabase.from('activity_log').select('*', { count: 'exact' });

    if (options.requestId) {
      query = query.eq('request_id', options.requestId);
    }

    if (options.action && options.action !== 'all') {
      query = query.eq('action', options.action);
    }

    const searchTerm = normalizeSearchTerm(options.search);
    if (searchTerm) {
      query = query.or(
        [
          `actor_name.ilike.%${searchTerm}%`,
          `notes.ilike.%${searchTerm}%`,
          `action.ilike.%${searchTerm}%`,
        ].join(',')
      );
    }

    if (options.date) {
      const startOfDay = new Date(`${options.date}T00:00:00.000Z`).toISOString();
      const endOfDay = new Date(`${options.date}T23:59:59.999Z`).toISOString();
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
    }

    const { data, error: fetchError, count } = await query
      .order('created_at', { ascending: false })
      .range(start, end);

    if (fetchError) {
      setLogs([]);
      setTotalCount(0);
      setPageCount(0);
      setError(fetchError.message);
    } else {
      const safeCount = count ?? 0;
      setLogs(data ?? []);
      setTotalCount(safeCount);
      setPageCount(Math.max(1, Math.ceil(safeCount / pageSize)));
    }

    setLoading(false);
  }, [options.action, options.date, options.enabled, options.requestId, options.search, page, pageSize]);

  useEffect(() => {
    void fetch();

    if (options.enabled === false) {
      return;
    }

    const channel = supabase
      .channel(`activity-log-${options.requestId ?? 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, () => {
        void fetch();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetch, options.enabled, options.requestId]);

  return {
    data: logs,
    totalCount,
    pageCount,
    loading,
    error,
    refetch: fetch,
  };
}

export function useRequestActivityLog(requestId: number | null | undefined) {
  return useActivityLog({
    enabled: Boolean(requestId),
    requestId: requestId ?? undefined,
    page: 1,
    pageSize: 100,
  });
}

export interface RoomWithAvailability extends Room {
  currentBooking: RoomBooking | null;
  status: 'available' | 'occupied';
}

export function useRoomAvailability(selectedTime: Date) {
  const [rooms, setRooms] = useState<RoomWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedTimeIso = selectedTime.toISOString();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: roomData, error: roomsError } = await supabase
      .from('rooms')
      .select('id, name, location, capacity, features, available')
      .order('name', { ascending: true });

    const fetchActiveBookings = async (tableName: 'room_bookings' | 'room_requests') => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .lte('start_time', selectedTimeIso)
        .gte('end_time', selectedTimeIso)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true });

      return { data: data || [], error };
    };

    const [roomBookingsResult, roomRequestsResult] = await Promise.all([
      fetchActiveBookings('room_bookings'),
      fetchActiveBookings('room_requests'),
    ]);

    const bookingErrors = [roomBookingsResult.error, roomRequestsResult.error].filter(Boolean);
    const bothBookingQueriesFailed = bookingErrors.length === 2;

    if (roomsError || bothBookingQueriesFailed) {
      setError(
        roomsError?.message ||
          bookingErrors.map((bookingError) => bookingError?.message).join(' ') ||
          'Unable to load room availability.',
      );
      setRooms([]);
      setLoading(false);
      return;
    }

    const bookingData = [...roomBookingsResult.data, ...roomRequestsResult.data];

    const bookingsByRoom = new Map<number, RoomBooking>();
    (bookingData || []).forEach((booking) => {
      if (!bookingsByRoom.has(booking.room_id)) {
        bookingsByRoom.set(booking.room_id, booking);
      }
    });

    setRooms(
      (roomData || []).map((room) => {
        const currentBooking = bookingsByRoom.get(room.id) || null;

        return {
          ...room,
          currentBooking,
          status: currentBooking ? 'occupied' : 'available',
        };
      }),
    );
    setLoading(false);
  }, [selectedTimeIso]);

  useEffect(() => {
    fetch();

    const roomsChannel = supabase
      .channel('rooms-availability-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetch)
      .subscribe();
    const bookingsChannel = supabase
      .channel('rooms-availability-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_bookings' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_requests' }, fetch)
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [fetch]);

  return { rooms, loading, error, refetch: fetch };
}

// ─── Actions ──────────────────────────────────────────────────────────────

export async function approveRequest(
  requestId: number,
  notes: string,
  actor: ActionActor,
  adminNotesOverride?: string | null,
) {
  const { error } = await supabase
    .from('requests')
    .update({
      status: 'approved',
      admin_notes: adminNotesOverride ?? notes,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actor.id ?? null,
    })
    .eq('id', requestId);

  if (!error) {
    await supabase.from('activity_log').insert({
      request_id: requestId,
      action: 'approved',
      actor_id: actor.id ?? null,
      actor_name: actor.name,
      notes,
    });
  }

  return { error };
}

export async function rejectRequest(
  requestId: number,
  notes: string,
  actor: ActionActor,
  adminNotesOverride?: string | null,
) {
  const { error } = await supabase
    .from('requests')
    .update({
      status: 'rejected',
      admin_notes: adminNotesOverride ?? notes,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actor.id ?? null,
    })
    .eq('id', requestId);

  if (!error) {
    await supabase.from('activity_log').insert({
      request_id: requestId,
      action: 'rejected',
      actor_id: actor.id ?? null,
      actor_name: actor.name,
      notes,
    });
  }

  return { error };
}

export async function escalateRequest(
  requestId: number,
  notes: string,
  actor: ActionActor,
  adminNotesOverride?: string | null,
) {
  const { error } = await supabase
    .from('requests')
    .update({
      status: 'escalated',
      admin_notes: adminNotesOverride ?? notes,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actor.id ?? null,
    })
    .eq('id', requestId);

  if (!error) {
    await supabase.from('activity_log').insert({
      request_id: requestId,
      action: 'escalated',
      actor_id: actor.id ?? null,
      actor_name: actor.name,
      notes,
    });
  }

  return { error };
}

export async function requestMoreInfo(
  requestId: number,
  notes: string,
  actor: ActionActor,
  adminNotesOverride?: string | null,
) {
  const reviewedAt = new Date().toISOString();
  const baseUpdate = {
    admin_notes: adminNotesOverride ?? notes,
    reviewed_at: reviewedAt,
    reviewed_by: actor.id ?? null,
  };

  let { error } = await supabase
    .from('requests')
    .update({
      ...baseUpdate,
      status: 'info_requested',
    })
    .eq('id', requestId);

  // Backward compatibility for DBs that still have the old status CHECK constraint.
  if (error && isCheckConstraintError(error)) {
    const fallback = await supabase
      .from('requests')
      .update({
        ...baseUpdate,
        status: 'pending',
      })
      .eq('id', requestId);

    error = fallback.error;
  }

  if (!error) {
    const { error: logError } = await insertActivityLogWithFallback({
      request_id: requestId,
      action: 'info_requested',
      actor_id: actor.id ?? null,
      actor_name: actor.name,
      notes,
    });

    if (logError) {
      return { error: logError };
    }
  }

  return { error };
}

export async function addRequestNote(
  requestId: number,
  note: string,
  actor: ActionActor,
  adminNotesOverride?: string | null,
) {
  const { error } = await supabase
    .from('requests')
    .update({
      admin_notes: adminNotesOverride ?? note,
      reviewed_by: actor.id ?? null,
    })
    .eq('id', requestId);

  if (!error) {
    const { error: logError } = await insertActivityLogWithFallback({
      request_id: requestId,
      action: 'note_added',
      actor_id: actor.id ?? null,
      actor_name: actor.name,
      notes: note,
    }, 'reviewed');

    if (logError) {
      return { error: logError };
    }
  }

  return { error };
}

export async function submitRequestViaEmail(payload: {
  from: string;
  subject: string;
  body: string;
}) {
  const { error } = await supabase.from('emails').insert({
    sender: payload.from,
    subject: payload.subject,
    body: payload.body,
    read: false,
    received_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}
