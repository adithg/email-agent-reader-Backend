import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, MessageSquare, Clock, User, Building2, Calendar, ShieldAlert, Info, PencilLine, MailQuestion, Sparkles } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { useRequest, useRequestActivityLog, approveRequest, rejectRequest, escalateRequest, requestMoreInfo, addRequestNote } from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';

function getStatusVariant(status: string) {
  if (status === 'approved' || status === 'auto_approved') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'info_requested') return 'info';
  return 'danger';
}

function getTimelineEvent(action: string) {
  switch (action) {
    case 'approved':
      return {
        label: 'Approved',
        icon: CheckCircle2,
        badge: 'success' as const,
        dot: 'bg-green-500 text-white',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        icon: XCircle,
        badge: 'danger' as const,
        dot: 'bg-red-500 text-white',
      };
    case 'escalated':
      return {
        label: 'Escalated',
        icon: AlertTriangle,
        badge: 'danger' as const,
        dot: 'bg-amber-500 text-white',
      };
    case 'info_requested':
      return {
        label: 'Info Requested',
        icon: MailQuestion,
        badge: 'info' as const,
        dot: 'bg-blue-500 text-white',
      };
    case 'note_added':
      return {
        label: 'Reviewer Note',
        icon: PencilLine,
        badge: 'warning' as const,
        dot: 'bg-slate-700 text-white',
      };
    case 'auto_approved':
      return {
        label: 'Auto-Approved',
        icon: Sparkles,
        badge: 'success' as const,
        dot: 'bg-emerald-500 text-white',
      };
    case 'risk_scored':
      return {
        label: 'AI Risk Scored',
        icon: ShieldAlert,
        badge: 'info' as const,
        dot: 'bg-violet-500 text-white',
      };
    case 'request_submitted':
      return {
        label: 'Request Submitted',
        icon: MessageSquare,
        badge: 'neutral' as const,
        dot: 'bg-slate-400 text-white',
      };
    default:
      return {
        label: action.replace(/_/g, ' '),
        icon: Clock,
        badge: 'neutral' as const,
        dot: 'bg-slate-300 text-slate-700',
      };
  }
}

export default function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, user, isAdmin } = useAuth();
  const { request, loading, error, refetch } = useRequest(id, {
    isAdmin,
    requesterEmail: user?.email,
  });
  const {
    data: logs,
    loading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useRequestActivityLog(request?.id);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const actor = useMemo(() => ({
    id: profile?.id,
    name: profile?.full_name || 'Admin',
  }), [profile?.full_name, profile?.id]);

  if (loading) {
    return <LoadingState message="Loading request..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="We couldn't load this request"
        message={error}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!request) {
    return (
      <EmptyState
        title="Request not found"
        description="It may have been removed or you may not have access to it."
        action={<Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>}
      />
    );
  }

  const buildNextAdminNotes = (nextNote: string) => {
    const trimmed = nextNote.trim();
    if (!trimmed) {
      return request.admin_notes;
    }

    const stampedNote = `[${new Date().toLocaleString()}] ${actor.name}: ${trimmed}`;
    return request.admin_notes ? `${request.admin_notes}\n\n${stampedNote}` : stampedNote;
  };

  const doAction = async (
    fn: typeof approveRequest | typeof rejectRequest | typeof escalateRequest | typeof requestMoreInfo,
    msg: string
  ) => {
    setActionLoading(true);
    const nextAdminNotes = buildNextAdminNotes(notes);
    const { error: actionError } = await fn(request.id, notes.trim(), actor, nextAdminNotes);
    if (actionError) {
      setActionMsg('Error: ' + actionError.message);
    } else {
      setActionMsg(msg);
      setNotes('');
      await Promise.all([refetch(), refetchLogs()]);
    }
    setActionLoading(false);
  };

  const saveNote = async () => {
    const trimmed = notes.trim();
    if (!trimmed) {
      setActionMsg('Add a note before saving it to the timeline.');
      return;
    }

    setActionLoading(true);
    const { error: noteError } = await addRequestNote(
      request.id,
      trimmed,
      actor,
      buildNextAdminNotes(trimmed),
    );

    if (noteError) {
      setActionMsg('Error: ' + noteError.message);
    } else {
      setActionMsg('📝 Note saved to the request timeline');
      setNotes('');
      await Promise.all([refetch(), refetchLogs()]);
    }
    setActionLoading(false);
  };

  const statusVariant = getStatusVariant(request.status);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted hover:text-primary-dark transition-colors font-medium"><ArrowLeft className="w-4 h-4" />Back</button>
        <div className="flex items-center gap-3">
          <Badge variant={statusVariant}>{request.status.replace(/_/g, ' ').toUpperCase()}</Badge>
          <span className="text-sm text-muted">Submitted {new Date(request.submitted_at).toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-primary-dark mb-2">{request.title}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-muted">
                  <div className="flex items-center gap-1.5"><User className="w-4 h-4" />{request.requester_name || request.requester_email}</div>
                  <div className="flex items-center gap-1.5"><Building2 className="w-4 h-4" />{request.department || '—'}</div>
                  <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{request.category}</div>
                  <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" />Urgency: <span className="font-semibold text-primary-dark capitalize">{request.urgency}</span></div>
                </div>
              </div>
              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Description</h3>
                <p className="text-primary-dark leading-relaxed whitespace-pre-wrap">{request.description}</p>
              </div>
              {request.admin_notes && (
                <div className="border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Reviewer Notes</h3>
                  <p className="text-primary-dark leading-relaxed whitespace-pre-wrap">{request.admin_notes}</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Audit Timeline" subtitle="History of actions taken on this request">
            {logsLoading ? (
              <LoadingState message="Loading audit timeline..." />
            ) : logsError ? (
              <ErrorState
                title="We couldn't load the audit timeline"
                message={logsError}
                onRetry={() => void refetchLogs()}
              />
            ) : logs.length === 0 ? <p className="text-muted text-sm">No activity yet.</p> : (
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
                {logs.map((entry) => {
                  const event = getTimelineEvent(entry.action);
                  const EventIcon = event.icon;

                  return (
                  <div key={entry.id} className="relative flex items-start">
                    <div className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white z-10 ${event.dot}`}>
                      <EventIcon className="h-4 w-4" />
                    </div>
                    <div className="ml-14 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold capitalize text-primary-dark">{event.label}</span>
                          <Badge variant={event.badge}>{entry.action.replace(/_/g, ' ')}</Badge>
                        </div>
                        <span className="text-xs text-muted">{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-muted">by <span className="font-medium text-slate-700">{entry.actor_name || 'System'}</span></p>
                      {entry.notes && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{entry.notes}</p>}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-8">
          <Card className={`border-l-4 ${request.risk_level === 'high' ? 'border-l-danger bg-red-50/30' : request.risk_level === 'medium' ? 'border-l-warning bg-amber-50/30' : 'border-l-success bg-green-50/30'}`}>
            <div className="flex items-center gap-2 mb-4"><ShieldAlert className="w-5 h-5 text-danger" /><h3 className="font-bold text-primary-dark">AI Risk Analysis</h3></div>
            <div className="mb-6">
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm font-medium text-muted">Risk Score</span>
                <span className={`text-4xl font-black ${request.risk_level === 'low' ? 'text-success' : request.risk_level === 'medium' ? 'text-warning' : 'text-danger'}`}>{request.risk_score ?? '—'}</span>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${request.risk_level === 'low' ? 'bg-success' : request.risk_level === 'medium' ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${request.risk_score ?? 0}%` }} />
              </div>
              {request.risk_level && <div className="mt-2 flex justify-center"><Badge variant={request.risk_level === 'low' ? 'success' : request.risk_level === 'medium' ? 'warning' : 'danger'}>{request.risk_level.toUpperCase()} RISK</Badge></div>}
            </div>
            {request.ai_summary && (
              <div className="bg-white/80 p-4 rounded-xl border border-current/10">
                <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase mb-2"><Info className="w-3 h-3" />AI Summary</div>
                <p className="text-sm text-slate-700 leading-relaxed">{request.ai_summary}</p>
              </div>
            )}
          </Card>

          {request.status === 'info_requested' ? (
            <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
              <div className="flex items-start gap-3">
                <MailQuestion className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-primary-dark">Waiting on requester information</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    This request has been paused until the requester provides the missing context noted below.
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          {isAdmin && (
            <Card title="Reviewer Actions" subtitle="Add context, request follow-up, or resolve the request.">
              {actionMsg && <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">{actionMsg}</div>}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted uppercase">New Timeline Note</label>
                  <textarea className="w-full p-3 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-blue/20 min-h-[110px]" placeholder="Add reviewer context, approval rationale, or the follow-up you need from the requester..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 gap-3 pt-2">
                  <Button className="w-full gap-2" variant="secondary" disabled={actionLoading} onClick={saveNote}><PencilLine className="w-4 h-4" />Save Note</Button>
                  {(request.status === 'pending' || request.status === 'escalated' || request.status === 'info_requested') ? (
                    <>
                      <Button className="w-full gap-2" variant="primary" disabled={actionLoading} onClick={() => doAction(approveRequest, '✅ Request approved')}><CheckCircle2 className="w-4 h-4" />Approve Request</Button>
                      <Button className="w-full gap-2" variant="danger" disabled={actionLoading} onClick={() => doAction(rejectRequest, '❌ Request rejected')}><XCircle className="w-4 h-4" />Reject Request</Button>
                      <Button className="w-full gap-2" variant="outline" disabled={actionLoading} onClick={() => doAction(escalateRequest, '⚠️ Request escalated')}><AlertTriangle className="w-4 h-4 text-warning" />Escalate</Button>
                      <Button className="w-full gap-2" variant="ghost" disabled={actionLoading} onClick={() => doAction(requestMoreInfo, '📨 Requester asked for more information')}><MessageSquare className="w-4 h-4" />Request More Info</Button>
                    </>
                  ) : null}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
