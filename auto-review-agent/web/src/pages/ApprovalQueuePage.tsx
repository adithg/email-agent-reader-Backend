import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { Pagination } from '../components/ui/Pagination';
import { useRequests, approveRequest, rejectRequest, escalateRequest } from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { Request } from '../lib/supabase';

export default function ApprovalQueuePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const {
    data: requests,
    loading,
    error,
    refetch,
    totalCount,
    pageCount,
  } = useRequests({
    page,
    pageSize,
    search: searchTerm,
    status: statusFilter,
    riskLevel: riskFilter,
    isAdmin: true,
  });

  const statuses = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'info_requested', label: 'Info Requested' },
    { value: 'escalated', label: 'Escalated' },
    { value: 'auto_approved', label: 'Auto-Approved' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const riskLevels = [
    { value: 'all', label: 'All Risk Levels' },
    { value: 'low', label: 'Low Risk' },
    { value: 'medium', label: 'Medium Risk' },
    { value: 'high', label: 'High Risk' },
  ];

  useEffect(() => {
    setPage(1);
  }, [riskFilter, searchTerm, statusFilter]);

  const handleApprove = async (req: Request) => {
    setActionLoading(req.id);
    setActionError(null);
    const { error: approveError } = await approveRequest(req.id, 'Approved from queue', {
      id: profile?.id,
      name: profile?.full_name || 'Admin',
    });
    if (approveError) {
      setActionError(approveError.message);
    } else {
      await refetch();
    }
    setActionLoading(null);
  };

  const handleReject = async (req: Request) => {
    setActionLoading(req.id);
    setActionError(null);
    const { error: rejectError } = await rejectRequest(req.id, 'Rejected from queue', {
      id: profile?.id,
      name: profile?.full_name || 'Admin',
    });
    if (rejectError) {
      setActionError(rejectError.message);
    } else {
      await refetch();
    }
    setActionLoading(null);
  };

  const handleEscalate = async (req: Request) => {
    setActionLoading(req.id);
    setActionError(null);
    const { error: escalateError } = await escalateRequest(req.id, 'Escalated from queue', {
      id: profile?.id,
      name: profile?.full_name || 'Admin',
    });
    if (escalateError) {
      setActionError(escalateError.message);
    } else {
      await refetch();
    }
    setActionLoading(null);
  };

  const columns = [
    { header: 'Request', accessor: (req: Request) => (<div className="flex flex-col"><span className="font-medium text-primary-dark">{req.title}</span><span className="text-xs text-muted">#{req.id}</span></div>) },
    { header: 'Requester', accessor: (req: Request) => req.requester_name || req.requester_email || '—' },
    { header: 'Category', accessor: 'category' },
    { header: 'Risk', accessor: (req: Request) => (<div className="flex items-center gap-2"><span className={`text-sm font-bold ${req.risk_level === 'low' ? 'text-success' : req.risk_level === 'medium' ? 'text-warning' : 'text-danger'}`}>{req.risk_score ?? '—'}</span>{req.risk_level && <Badge variant={req.risk_level === 'low' ? 'success' : req.risk_level === 'medium' ? 'warning' : 'danger'}>{req.risk_level.toUpperCase()}</Badge>}</div>) },
    { header: 'Status', accessor: (req: Request) => { const v: Record<string, any> = { pending: { label: 'Pending', variant: 'warning' }, info_requested: { label: 'Info Requested', variant: 'info' }, auto_approved: { label: 'Auto-Approved', variant: 'info' }, approved: { label: 'Approved', variant: 'success' }, rejected: { label: 'Rejected', variant: 'danger' }, escalated: { label: 'Escalated', variant: 'danger' } }; const c = v[req.status] || { label: req.status, variant: 'neutral' }; return <Badge variant={c.variant}>{c.label}</Badge>; } },
    { header: 'Submitted', accessor: (req: Request) => new Date(req.submitted_at).toLocaleDateString() },
    {
      header: 'Actions',
      accessor: (req: Request) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); navigate(`/request/${req.id}`); }} className="p-1.5 text-muted hover:text-accent-blue hover:bg-blue-50 rounded-lg transition-colors" title="View"><Eye className="w-4 h-4" /></button>
          {(req.status === 'pending' || req.status === 'escalated' || req.status === 'info_requested') && (<>
            <button onClick={(e) => { e.stopPropagation(); handleApprove(req); }} disabled={actionLoading === req.id} className="p-1.5 text-muted hover:text-success hover:bg-green-50 rounded-lg transition-colors" title="Approve"><CheckCircle className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); handleReject(req); }} disabled={actionLoading === req.id} className="p-1.5 text-muted hover:text-danger hover:bg-red-50 rounded-lg transition-colors" title="Reject"><XCircle className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); handleEscalate(req); }} disabled={actionLoading === req.id} className="p-1.5 text-muted hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Escalate"><AlertCircle className="w-4 h-4" /></button>
          </>)}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-primary-dark">Approval Queue</h1><p className="text-muted">Manage and review all incoming approval requests.</p></div>
        <Button variant="outline" className="gap-2" disabled><Filter className="w-4 h-4" />Export CSV</Button>
      </div>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" /><Input placeholder="Search requests..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <Select options={statuses} defaultValue="all" onChange={(e: any) => setStatusFilter(e.target.value)} />
          <Select options={riskLevels} defaultValue="all" onChange={(e: any) => setRiskFilter(e.target.value)} />
        </div>
        {actionError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        ) : null}
        {loading ? (
          <LoadingState message="Loading requests..." />
        ) : error ? (
          <ErrorState
            title="We couldn't load the approval queue"
            message={error}
            onRetry={() => void refetch()}
          />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No requests match the current filters"
            description="Try adjusting the search, status, or risk filters."
          />
        ) : (
          <div className="-mx-6 -mb-6">
            <Table columns={columns} data={requests} onRowClick={(req) => navigate(`/request/${req.id}`)} />
            <Pagination
              page={page}
              pageCount={pageCount}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
