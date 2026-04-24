import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { Pagination } from '../components/ui/Pagination';
import { useDashboardStats, useMyRequests } from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { Request } from '../lib/supabase';

export default function MyRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const {
    data: requests,
    loading,
    error,
    refetch,
    totalCount,
    pageCount,
  } = useMyRequests({ requesterEmail: user?.email, page, pageSize });
  const { stats: statsData, loading: statsLoading } = useDashboardStats({
    requesterEmail: user?.email,
    isAdmin: false,
  });

  const statCards = [
    { title: 'Total Submitted', value: statsData.totalRequests, icon: FileText, color: 'bg-blue-500' },
    { title: 'Approved', value: statsData.approved + statsData.autoApproved, icon: CheckCircle, color: 'bg-green-500' },
    { title: 'Pending', value: statsData.pendingReview, icon: Clock, color: 'bg-amber-500' },
    { title: 'Rejected', value: statsData.rejected, icon: XCircle, color: 'bg-red-500' },
  ];

  const columns = [
    { header: 'Title', accessor: 'title' },
    { header: 'Category', accessor: 'category' },
    { header: 'Submitted', accessor: (req: Request) => new Date(req.submitted_at).toLocaleDateString() },
    { header: 'Status', accessor: (req: Request) => { const v: Record<string, any> = { pending: { label: 'Pending', variant: 'warning' }, auto_approved: { label: 'Auto-Approved', variant: 'info' }, approved: { label: 'Approved', variant: 'success' }, rejected: { label: 'Rejected', variant: 'danger' }, escalated: { label: 'Escalated', variant: 'danger' } }; const c = v[req.status] || { label: req.status, variant: 'neutral' }; return <Badge variant={c.variant}>{c.label}</Badge>; } },
    { header: 'Risk Score', accessor: (req: Request) => (<span className={`font-bold ${req.risk_level === 'low' ? 'text-success' : req.risk_level === 'medium' ? 'text-warning' : 'text-danger'}`}>{req.risk_score ?? '—'}</span>) },
    { header: 'Actions', accessor: (req: Request) => (<button onClick={() => navigate(`/request/${req.id}`)} className="p-1.5 text-muted hover:text-accent-blue hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>) },
  ];

  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold text-primary-dark">My Requests</h1><p className="text-muted">Track the status of your approval submissions.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="flex items-center gap-4 p-4">
            <div className={`${stat.color} p-3 rounded-xl text-white`}><stat.icon className="w-6 h-6" /></div>
            <div><p className="text-sm text-muted font-medium">{stat.title}</p><h3 className="text-2xl font-bold text-primary-dark">{statsLoading ? '-' : stat.value}</h3></div>
          </Card>
        ))}
      </div>
      <Card>
        {loading ? (
          <LoadingState message="Loading your requests..." />
        ) : error ? (
          <ErrorState
            title="We couldn't load your requests"
            message={error}
            onRetry={() => void refetch()}
          />
        ) : requests.length === 0 ? (
          <EmptyState
            title="You haven't submitted any requests yet"
            description="Once you submit a request, you'll be able to track it here."
          />
        ) : (
          <div className="-mx-6 -mb-6">
            <Table columns={columns} data={requests} />
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
