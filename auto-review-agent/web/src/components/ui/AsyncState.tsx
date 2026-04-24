import { ReactNode } from 'react';
import { Button } from './Button';

interface StateCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

function StateCard({ title, description, action }: StateCardProps) {
  return (
    <div className="py-12 text-center">
      <h3 className="text-base font-semibold text-primary-dark">{title}</h3>
      {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return <StateCard title={message} description="This should only take a moment." />;
}

export function EmptyState({
  title,
  description,
  action,
}: StateCardProps) {
  return <StateCard title={title} description={description} action={action} />;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
}) {
  return (
    <StateCard
      title={title}
      description={message || 'Please try again.'}
      action={
        onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null
      }
    />
  );
}
