'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);

  const passwordsMatch = password === confirmPass && password.length > 0;
  const isStrong = password.length >= 8;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passwordsMatch) {
      setError('As passwords não coincidem.');
      return;
    }
    if (!isStrong) {
      setError('A password deve ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) throw signUpError;
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg === 'User already registered' ? 'Este email já está registado.' : msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
        <div className="w-full max-w-sm animate-fade-in text-center">
          <div className="w-16 h-16 rounded-2xl bg-success/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-success" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Confirma o teu email</h2>
          <p className="text-sm text-muted mb-6">
            Enviámos um link de confirmação para <span className="text-white">{email}</span>.
            Clica no link para ativar a conta.
          </p>
          <Link
            href="/login"
            className="text-accent hover:underline text-sm font-medium"
          >
            ← Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mb-3">
            <Wallet size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Wallet Dashboard</h1>
          <p className="text-sm text-muted mt-1">Cria a tua conta</p>
        </div>

        {/* Card */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-6 space-y-4">
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs text-muted font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                required
                disabled={loading}
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
                  placeholder="Mínimo 8 caracteres"
                  required
                  disabled={loading}
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
              {password && !isStrong && (
                <p className="text-xs text-warning mt-1">Mínimo 8 caracteres</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-muted font-medium mb-1.5">Confirmar Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="Repete a password"
                  required
                  disabled={loading}
                  className="w-full px-3 py-2.5 pr-10 bg-bg-tertiary border border-border rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                />
                {confirmPass && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {passwordsMatch
                      ? <CheckCircle2 size={15} className="text-success" />
                      : <AlertCircle size={15} className="text-danger" />
                    }
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password || !confirmPass}
              className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              Criar Conta
            </button>
          </form>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-muted mt-4">
          Já tens conta?{' '}
          <Link href="/login" className="text-accent hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
