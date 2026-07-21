import { useEffect, useState } from 'react';
import { ArrowRight, Building2, Eye, EyeOff, Gavel, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDefaultPathForRole } from '../../config/roleConfig';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, roleKey, loading, error: authError } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && roleKey) {
      navigate(getDefaultPathForRole(roleKey), { replace: true });
    }
  }, [loading, navigate, roleKey]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const result = await signIn(form.email.trim(), form.password);
      navigate(result.path, { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const stateMessage = location.state?.message;

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <main className="relative flex flex-grow items-center justify-center overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:radial-gradient(circle,#0058be_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative w-full max-w-[440px]">
          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                <Building2 size={18} />
              </div>
              <span className="font-headline text-3xl font-black tracking-tighter text-primary">FixItLocal</span>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-[0_20px_40px_rgba(11,28,48,0.04)] md:p-10">
            <div className="mb-8">
              <h1 className="mb-2 font-headline text-2xl font-bold tracking-tight text-primary">Welcome Back</h1>
              <p className="font-medium text-on-surface-variant">Access your official local authority portal.</p>
            </div>

            {stateMessage ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {stateMessage}
              </div>
            ) : null}

            {error || authError ? (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error || authError}
              </div>
            ) : null}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface" htmlFor="email">
                  Official Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-on-surface-variant">
                    <Mail size={18} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    className="w-full rounded-xl border-none bg-surface-container-low py-3 pl-11 pr-4 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-secondary/20"
                    placeholder="name@authority.gov"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-on-surface" htmlFor="password">
                    Password
                  </label>
                  <button type="button" className="text-xs font-semibold text-secondary hover:underline">
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-on-surface-variant">
                    <Lock size={18} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    className="w-full rounded-xl border-none bg-surface-container-low py-3 pl-11 pr-11 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-secondary/20"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-on-surface-variant transition-colors hover:text-secondary"
                    onClick={() => setShowPassword((previous) => !previous)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-semibold text-white shadow-lg shadow-primary/10 transition-all active:scale-[0.98] hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4 text-xs font-medium text-on-surface-variant/60">
            <div className="flex items-center gap-1">
              <ShieldCheck size={14} />
              <span>256-bit SSL Encrypted</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-outline-variant/30" />
            <div className="flex items-center gap-1">
              <Gavel size={14} />
              <span>Official Civic Portal</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="flex flex-col items-center justify-between border-t border-on-surface/5 bg-background px-8 py-12 md:flex-row">
        <div className="mb-4 md:mb-0">
          <span className="font-headline font-bold text-primary">FixItLocal Civic Authority</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-primary/60">
          <button type="button" className="opacity-80 transition-all hover:text-secondary hover:opacity-100">
            Accessibility
          </button>
          <button type="button" className="opacity-80 transition-all hover:text-secondary hover:opacity-100">
            Data Policy
          </button>
          <button type="button" className="opacity-80 transition-all hover:text-secondary hover:opacity-100">
            System Status
          </button>
          <button type="button" className="opacity-80 transition-all hover:text-secondary hover:opacity-100">
            Security
          </button>
        </div>
        <div className="mt-6 text-sm text-primary/60 md:mt-0">
          © {new Date().getFullYear()} FixItLocal Civic Authority. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default LoginPage;

