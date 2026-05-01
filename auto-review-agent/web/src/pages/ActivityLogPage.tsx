import { useEffect, useState } from 'react';
import { Search, Calendar as CalendarIcon } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { Pagination } from '../components/ui/Pagination';
import { useActivityLog } from '../hooks/useSupabase';
import { ActivityLog } from '../lib/supabase';

export default function ActivityLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const {
    data: logs,
    loading,
    error,
    refetch,
    totalCount,
    pageCount,
  } = useActivityLog({
    page,
    pageSize,
    search: searchTerm,
    action: actionFilter,
    date: dateFilter || undefined,
  });

  const actionTypes = [
    { value: 'all', label: 'All Actions' },
    { value: 'request_submitted', label: 'Request Submitted' },
    { value: 'risk_scored', label: 'Risk Scored' },
    { value: 'auto_approved', label: 'Auto-Approved' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'escalated', label: 'Escalated' },
    { value: 'info_requested', label: 'Info Requested' },
    { value: 'note_added', label: 'Note Added' },
  ];

  useEffect(() => {
    setPage(1);
  }, [actionFilter, dateFilter, searchTerm]);

  const columns = [
    { header: 'Timestamp', accessor: (log: ActivityLog) => new Date(log.created_at).toLocaleString(), className: 'whitespace-nowrap' },
    { header: 'Action', accessor: (log: ActivityLog) => (<Badge variant={log.action === 'auto_approved' || log.action === 'approved' ? 'success' : log.action === 'rejected' || log.action === 'escalated' ? 'danger' : log.action === 'risk_scored' || log.action === 'info_requested' ? 'info' : log.action === 'note_added' ? 'warning' : 'neutral'}>{log.action.replace(/_/g, ' ').toUpperCase()}</Badge>) },
    { header: 'Request ID', accessor: (log: ActivityLog) => log.request_id ? `#${log.request_id}` : '—' },
    { header: 'Actor', accessor: (log: ActivityLog) => log.actor_name || 'System' },
    { header: 'Notes', accessor: (log: ActivityLog) => log.notes || '—', className: 'max-w-xs truncate' },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-primary-dark">Activity Log</h1><p className="text-muted">Audit trail of all system and user actions.</p></div>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" /><Input placeholder="Search by actor or ID..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <Select options={actionTypes} defaultValue="all" onChange={(e: any) => setActionFilter(e.target.value)} />
          <div className="relative"><CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" /><Input type="date" className="pl-10" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} /></div>
        </div>
        {loading ? (
          <LoadingState message="Loading logs..." />
        ) : error ? (
          <ErrorState
            title="We couldn't load the activity log"
            message={error}
            onRetry={() => void refetch()}
          />
        ) : logs.length === 0 ? (
          <EmptyState
            title="No activity matched the current filters"
            description="Try a different actor, action, or date."
          />
        ) : (
          <div className="-mx-6 -mb-6">
            <Table columns={columns} data={logs} />
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
