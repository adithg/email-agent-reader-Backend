import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const redirectTo = location.state && typeof location.state === 'object' && 'from' in location.state
    ? (location.state.from as { pathname?: string })?.pathname || '/'
    : '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    else navigate(redirectTo, { replace: true });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-accent-blue rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-accent-blue/20"><ShieldCheck className="w-7 h-7 text-white" /></div>
          <h1 className="text-2xl font-bold text-primary-dark">Auto-Review Agent</h1>
          <p className="text-muted mt-2">Sign in to your account to continue</p>
        </div>
        <Card className="p-8">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input label="Email Address" type="email" placeholder="name@company.com" required autoFocus value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Password" type="password" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} />
            <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button>
          </form>
        </Card>
        <p className="text-center mt-8 text-sm text-muted">Don't have an account?{' '}<Link to="/register" className="font-semibold text-accent-blue hover:underline">Create an account</Link></p>
      </div>
    </div>
  );
}
