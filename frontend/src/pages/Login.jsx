import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../utils/api';
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token } = response.data.data;
      
      // Save token in LocalStorage and trigger AuthContext state change
      login(token);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error response:', err);
      setError(err.message || 'Invalid email or password. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-dark relative overflow-hidden">
      {/* Visual glowing backdrops */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/5 rounded-full blur-3xl"></div>

      <div className="glass-panel p-8 rounded-2xl w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-violet-600/20 p-3 rounded-2xl text-violet-400 mb-3 border border-violet-500/20">
            <ShieldCheck className="h-8 w-8 text-violet-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Smart Asset Platform</h2>
          <p className="text-slate-400 text-sm mt-1 text-center">Cultural Council • IIT Roorkee</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-950/30 border border-red-500/30 rounded-lg p-3 flex items-start gap-3 text-red-200 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@iitr.ac.in"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 text-sm transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 text-sm transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 disabled:cursor-not-allowed text-white py-2.5 rounded-lg glow-btn font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying Credentials...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
