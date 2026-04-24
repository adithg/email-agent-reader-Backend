import { BarChart, PieChart, TrendingUp, Clock, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { useDashboardStats } from '../hooks/useSupabase';

export default function AnalyticsPage() {
  const { stats, loading, error, refetch } = useDashboardStats({ isAdmin: true });
  const totalOutcomes =
    stats.autoApproved + stats.approved + stats.rejected + stats.pendingReview + stats.escalated;
  const totalRisk =
    stats.riskDistribution.low +
      stats.riskDistribution.medium +
      stats.riskDistribution.high || 1;

  if (loading) {
    return <LoadingState message="Loading analytics..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="We couldn't load analytics"
        message={error}
        onRetry={() => void refetch()}
      />
    );
  }

  if (stats.totalRequests === 0) {
    return (
      <EmptyState
        title="No analytics yet"
        description="Analytics will appear after the first requests are processed."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">Analytics</h1>
        <p className="text-muted">Live performance metrics for the approval system.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card title="Approval Outcomes" subtitle="Current distribution of request decisions">
          <div className="grid gap-4 pt-2">
            {[
              { label: 'Auto-Approved', value: stats.autoApproved, color: 'bg-success' },
              { label: 'Approved by Admin', value: stats.approved, color: 'bg-blue-500' },
              { label: 'Pending Review', value: stats.pendingReview, color: 'bg-warning' },
              { label: 'Escalated', value: stats.escalated, color: 'bg-danger' },
              { label: 'Rejected', value: stats.rejected, color: 'bg-slate-500' },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-primary-dark">{item.label}</span>
                  <span className="text-muted">{item.value}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${(item.value / Math.max(totalOutcomes, 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Risk Breakdown" subtitle="How the AI is classifying incoming requests">
          <div className="grid gap-4 pt-2">
            {[
              { label: 'Low Risk', value: stats.riskDistribution.low, color: 'bg-success' },
              { label: 'Medium Risk', value: stats.riskDistribution.medium, color: 'bg-warning' },
              { label: 'High Risk', value: stats.riskDistribution.high, color: 'bg-danger' },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-primary-dark">{item.label}</span>
                  <span className="text-muted">{item.value}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${(item.value / totalRisk) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-2">
          <Card className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-full bg-blue-50 p-3">
              <BarChart className="h-8 w-8 text-accent-blue" />
            </div>
            <h4 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Total Requests</h4>
            <p className="text-4xl font-black text-primary-dark">{stats.totalRequests}</p>
            <p className="mt-2 text-xs font-medium text-muted">Live total across the requests table</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-full bg-green-50 p-3">
              <ShieldCheck className="h-8 w-8 text-success" />
            </div>
            <h4 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Automation Rate</h4>
            <p className="text-4xl font-black text-primary-dark">
              {Math.round((stats.autoApproved / Math.max(stats.totalRequests, 1)) * 100)}%
            </p>
            <p className="mt-2 text-xs font-medium text-muted">Requests resolved without manual review</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-full bg-amber-50 p-3">
              <Clock className="h-8 w-8 text-warning" />
            </div>
            <h4 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Review Backlog</h4>
            <p className="text-4xl font-black text-primary-dark">{stats.pendingReview + stats.escalated}</p>
            <p className="mt-2 text-xs font-medium text-muted">Requests still waiting on admin follow-up</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-3">
              <TrendingUp className="h-8 w-8 text-slate-700" />
            </div>
            <h4 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Approval Yield</h4>
            <p className="text-4xl font-black text-primary-dark">
              {Math.round(
                ((stats.autoApproved + stats.approved) / Math.max(totalOutcomes, 1)) * 100
              )}%
            </p>
            <p className="mt-2 text-xs font-medium text-muted">Share of requests that ended approved</p>
          </Card>
        </div>

        <Card title="Analytics Notes" subtitle="What these numbers represent">
          <div className="space-y-3 text-sm text-muted">
            <p>
              Risk and decision counts are computed with filtered count queries instead of downloading the full requests table.
            </p>
            <p>
              These metrics respect the same row-level access controls as the rest of the app, so admin-only analytics stay admin-only.
            </p>
            <p>
              If you want trend charts next, the clean follow-up would be adding time-bucketed SQL views or RPC endpoints rather than rebuilding them in the browser.
            </p>
          </div>
        </Card>

        <Card title="Legend" subtitle="Quick visual mapping">
          <div className="grid gap-3 text-sm text-muted">
            <div className="flex items-center gap-2"><PieChart className="h-4 w-4 text-success" />Green bars indicate approvals or low-risk requests.</div>
            <div className="flex items-center gap-2"><PieChart className="h-4 w-4 text-warning" />Amber bars indicate medium risk or pending manual review.</div>
            <div className="flex items-center gap-2"><PieChart className="h-4 w-4 text-danger" />Red bars indicate escalated or high-risk traffic.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
