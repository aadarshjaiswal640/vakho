import React, { useState } from 'react';
import { supabase } from '../services/supabaseService';
import { Sparkles, ArrowRight, Loader2, Lock, Mail, Github, Code } from 'lucide-react';

interface AuthProps {
  onLogin: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // NEW: forgot password UI toggle
  const [showForgot, setShowForgot] = useState(false);

  const ensureProfileExists = async (user: any) => {
    if (!user?.id) return;

    // Try to fetch existing profile
    const { data: existing, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchErr && fetchErr.message && fetchErr.code !== 'PGRST116') {
      // Something unexpected happened (PGRST116 = row not found when single())
      throw fetchErr;
    }

    if (!existing) {
      // Create a default profile row for this user
      const payload = {
        user_id: user.id,
        email: user.email ?? null,
        name: user.email?.split('@')[0] ?? '',
        role: 'Aspiring Developer',
        bio: 'New to Vak AI.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: upserted, error: upsertErr } = await supabase
        .from('profiles')
        .upsert(payload, { returning: 'representation' })
        .select()
        .single();

      if (upsertErr) throw upsertErr;
      return upserted;
    }

    return existing;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSignupSuccess(false);

    try {
      if (isSignUp) {
        // signup
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        const user = data?.user;
        const emailConfirmationRequired = !user || (user && !user.confirmed_at && !data?.session);
        
        if (emailConfirmationRequired) {
          // Email confirmation required — show success message
          setSignupSuccess(true);
          setLoading(false);
          return;
        }

        // Ensure profile exists for this user
        try {
          await ensureProfileExists(user);
        } catch (profileErr) {
          console.error('Profile creation error (non-blocking):', profileErr);
        }
        onLogin();
      } else {
        // sign in
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          // Check if email not confirmed
          if (signInError.message?.toLowerCase().includes('email not confirmed')) {
            setError('Please verify your email before signing in. Check your inbox for the verification link.');
            setLoading(false);
            return;
          }
          throw signInError;
        }

        // v2 returns data.session.user or data.user depending on flow
        const user = data?.user ?? data?.session?.user;
        if (!user) {
          // No user object — treat as error
          throw new Error('Failed to sign in (no user returned)');
        }

        // Ensure profile exists (creates default if missing)
        try {
          await ensureProfileExists(user);
        } catch (profileErr) {
          console.error('Profile creation error (non-blocking):', profileErr);
        }
        onLogin();
      }
    } catch (err: any) {
      // Log full error for debugging
      console.error('Auth error:', err);
      
      // Show user-friendly error messages, hide technical details
      const rawMsg = (err && typeof err === 'object' && 'message' in err && (err as any).message) || String(err) || '';
      
      // List of technical error patterns to hide
      const technicalPatterns = [
        'row-level security',
        'rls',
        'policy',
        'pgrst',
        'violates',
        'constraint',
        'duplicate key',
      ];
      
      const isTechnicalError = technicalPatterns.some(pattern => 
        rawMsg.toLowerCase().includes(pattern)
      );
      
      if (isTechnicalError) {
        setError('Something went wrong. Please try again or contact support if the issue persists.');
      } else if (rawMsg.toLowerCase().includes('invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (rawMsg.toLowerCase().includes('email')) {
        setError(rawMsg);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Inline ForgotPassword component
  const ForgotPasswordPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [fpEmail, setFpEmail] = useState(email || '');
    const [status, setStatus] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
      try {
        setSending(true);
        setStatus(null);

        const redirectTo = `${window.location.origin}/update-password`; // ensure this route exists
        const { data, error } = await supabase.auth.resetPasswordForEmail(fpEmail, { redirectTo });
        if (error) throw error;

        // Supabase returns empty data typically — show friendly message
        setStatus('If that email exists, a reset link has been sent. Check your inbox (or spam).');
      } catch (err: any) {
        console.error('reset error', err);
        setStatus('Error sending reset email: ' + (err.message ?? String(err)));
      } finally {
        setSending(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
        <div className="relative bg-slate-900 p-6 rounded-lg max-w-md w-full shadow-lg z-10">
          <h3 className="text-xl font-semibold text-white mb-2">Reset password</h3>
          <p className="text-sm text-slate-400 mb-4">Enter your email and we'll send a reset link.</p>
          <input
            value={fpEmail}
            onChange={(e) => setFpEmail(e.target.value)}
            className="w-full p-2 rounded bg-slate-800 text-white mb-3"
            placeholder="you@example.com"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={sending || !fpEmail}
              className="px-4 py-2 bg-indigo-600 rounded text-white disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send reset email'}
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 rounded text-white">Close</button>
          </div>
          {status && <p className="mt-3 text-sm text-slate-300">{status}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex bg-[#020617] text-slate-200 font-sans">
      {/* Left Panel - Visuals */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-slate-950 items-center justify-center border-r border-slate-800">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 p-12 max-w-lg">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/30">
            <Code size={32} className="text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Code smarter, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">not harder.</span>
          </h1>
          <p className="text-lg text-slate-400 mb-8 leading-relaxed">
            Join thousands of developers using Vak's multimodal AI to visualize complex algorithms and debug in real-time.
          </p>

          <div className="space-y-4">
            {[
              'Interactive AI Socratic Mentor',
              'Real-time Logic Visualization',
              'Personalized Skill Analysis',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Sparkles size={12} className="text-emerald-400" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white tracking-tight">{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
            <p className="mt-2 text-slate-400">{isSignUp ? 'Start your journey with Vak AI today.' : 'Enter your credentials to access your workspace.'}</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-slate-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-slate-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
                {/* Forgot password link */}
                {!isSignUp && (
                  <div className="mt-2 text-right">
                    <button type="button" onClick={() => setShowForgot(true)} className="text-sm text-indigo-400 hover:underline">
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            </div>

            {signupSuccess && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 mb-2">
                  <Mail size={18} className="text-emerald-400" />
                  <span className="font-semibold">Check your email to verify your account</span>
                </div>
                <p className="text-emerald-400/80 text-xs leading-relaxed">
                  We've sent a verification link to <strong>{email}</strong>. Please click the link in your email to activate your account before signing in.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSignupSuccess(false);
                    setIsSignUp(false);
                  }}
                  className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 underline"
                >
                  Go to Sign In
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-900/20 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (
                <>
                  {isSignUp ? 'Sign Up Free' : 'Sign In'} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-[#020617] text-slate-500">Or continue with</span></div>
          </div>

          <button disabled className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 font-medium transition-colors opacity-50 cursor-not-allowed">
            <Github size={20} /> GitHub (Coming Soon)
          </button>

          <p className="text-center text-sm text-slate-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {isSignUp ? 'Sign in' : 'Sign up free'}
            </button>
          </p>
        </div>
      </div>

      {/* Render forgot password modal */}
      {showForgot && <ForgotPasswordPanel onClose={() => setShowForgot(false)} />}
    </div>
  );
};
