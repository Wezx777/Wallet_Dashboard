'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type LoadingState = 'email' | 'google' | 'github' | 'metamask' | null;

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState<LoadingState>(null);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (searchParams.get('error') === 'auth_callback_error') {
      setError('Autenticação falhou. Tenta novamente.');
    }
  }, [searchParams]);

  const supabase = createClient();

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading('email');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg === 'Invalid login credentials' ? 'Email ou password incorretos.' : msg);
    } finally {
      setLoading(null);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError('');
    setLoading(provider);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OAuth falhou');
      setLoading(null);
    }
  };

  const handleMetaMask = async () => {
    setError('');
    const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!ethereum) {
      setError('MetaMask não encontrado. Instala a extensão MetaMask e tenta novamente.');
      return;
    }
    setLoading('metamask');
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const address = accounts[0];

      const nonceRes = await fetch('/api/auth/nonce');
      const { nonce, error: nonceError } = await nonceRes.json();
      if (nonceError) throw new Error(nonceError);

      const message = `Sign this message to authenticate with Wallet Dashboard:\n\nNonce: ${nonce}`;
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      }) as string;

      const authRes = await fetch('/api/auth/web3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, nonce }),
      });
      const { token_hash, type, error: authError } = await authRes.json();
      if (authError) throw new Error(authError);

      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash, type });
      if (verifyError) throw verifyError;

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Autenticação MetaMask falhou');
    } finally {
      setLoading(null);
    }
  };

  const isLoading = loading !== null;

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mb-3">
            <Wallet size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Wallet Dashboard</h1>
          <p className="text-sm text-muted mt-1">Your all-in-one crypto portfolio tracker</p>
        </div>

        {/* Card */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-6 space-y-4">

          {/* Email/Password form */}
          <form onSubmit={handleEmail} className="space-y-3">
            <div>
              <label className="block text-xs text-muted font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                required
                disabled={isLoading}
                className="w-full px-3 py-2.5 bg-bg-tertiary border border-border rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="w-full px-3 py-2.5 pr-10 bg-bg-tertiary border border-border rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading === 'email' ? <Loader2 size={15} className="animate-spin" /> : null}
              Entrar
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted">ou continua com</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social / Web3 buttons */}
          <div className="space-y-2">
            {/* MetaMask */}
            <button
              onClick={handleMetaMask}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-4 py-2.5 bg-bg-tertiary hover:bg-border border border-border rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'metamask'
                ? <Loader2 size={18} className="animate-spin text-muted" />
                : <MetaMaskIcon />
              }
              MetaMask
            </button>

            {/* Google */}
            <button
              onClick={() => handleOAuth('google')}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-4 py-2.5 bg-bg-tertiary hover:bg-border border border-border rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'google'
                ? <Loader2 size={18} className="animate-spin text-muted" />
                : <GoogleIcon />
              }
              Google
            </button>

            {/* GitHub */}
            <button
              onClick={() => handleOAuth('github')}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-4 py-2.5 bg-bg-tertiary hover:bg-border border border-border rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'github'
                ? <Loader2 size={18} className="animate-spin text-muted" />
                : <GitHubIcon />
              }
              GitHub
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-muted mt-4">
          Não tens conta?{' '}
          <Link href="/register" className="text-accent hover:underline font-medium">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}

function MetaMaskIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32.9582 1L19.8241 10.7183L22.2665 4.99058L32.9582 1Z" fill="#E17726" stroke="#E17726" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.04858 1L15.0707 10.809L12.7395 4.99058L2.04858 1Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M28.2292 23.5334L24.7346 28.872L32.2117 30.9323L34.3616 23.6501L28.2292 23.5334Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M0.65332 23.6501L2.79059 30.9323L10.2677 28.872L6.78477 23.5334L0.65332 23.6501Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.85551 14.6846L7.77441 17.7626L15.1882 18.1005L14.9333 10.1626L9.85551 14.6846Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M25.1504 14.6846L20.0005 10.0725L19.8241 18.1005L27.2379 17.7626L25.1504 14.6846Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.2677 28.872L14.7357 26.6952L10.8803 23.7048L10.2677 28.872Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.2642 26.6952L24.7347 28.872L24.1196 23.7048L20.2642 26.6952Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  );
}
