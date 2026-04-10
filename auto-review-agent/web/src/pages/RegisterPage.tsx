import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'requester' | 'admin'>('requester');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roleOptions = [
    { value: 'requester', label: 'Requester' },
    { value: 'admin', label: 'Admin' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signUp(email, password, fullName, role, adminCode);
    if (error) setError(error.message);
    else navigate('/', { replace: true });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-accent-blue rounded-xl flex items-center justify-center mb-4"><ShieldCheck className="w-7 h-7 text-white" /></div>
          <h1 className="text-2xl font-bold text-primary-dark">Create Account</h1>
          <p className="text-muted mt-2">Join Auto-Review Agent</p>
        </div>
        <Card className="p-8">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input label="Full Name" placeholder="John Smith" required value={fullName} onChange={e => setFullName(e.target.value)} />
            <Input label="Email Address" type="email" placeholder="name@company.com" required value={email} onChange={e => setEmail(e.target.value)} />
            <Select
              label="Account Type"
              options={roleOptions}
              value={role}
              onChange={e => setRole(e.target.value as 'requester' | 'admin')}
            />
            {role === 'admin' && (
              <Input
                label="Organization Admin Code"
                type="password"
                placeholder="Enter admin code"
                required
                value={adminCode}
                onChange={e => setAdminCode(e.target.value)}
              />
            )}
            <Input label="Password" type="password" placeholder="Min. 6 characters" required value={password} onChange={e => setPassword(e.target.value)} />
            <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</Button>
          </form>
        </Card>
        <p className="text-center mt-8 text-sm text-muted">Already have an account?{' '}<Link to="/login" className="font-semibold text-accent-blue hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}
