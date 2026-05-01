'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { Wallet, PortfolioData, Transaction, Currency, Section, Chain, WalletCategory } from '@/types';
import { createClient } from '@/lib/supabase/client';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AppState {
  wallets: Wallet[];
  portfolio: PortfolioData | null;
  transactions: Transaction[];
  loading: boolean;
  loadingTx: boolean;
  error: string | null;
  currency: Currency;
  activeSection: Section;
  selectedWalletId: string | null;
  lastUpdated: number | null;
}

type Action =
  | { type: 'SET_WALLETS'; payload: Wallet[] }
  | { type: 'ADD_WALLET'; payload: Wallet }
  | { type: 'REMOVE_WALLET'; payload: string }
  | { type: 'SET_PORTFOLIO'; payload: PortfolioData }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_TX'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENCY'; payload: Currency }
  | { type: 'SET_SECTION'; payload: Section }
  | { type: 'SET_SELECTED_WALLET'; payload: string | null };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_WALLETS': return { ...state, wallets: action.payload };
    case 'ADD_WALLET': return { ...state, wallets: [...state.wallets, action.payload] };
    case 'REMOVE_WALLET': return { ...state, wallets: state.wallets.filter(w => w.id !== action.payload) };
    case 'SET_PORTFOLIO': return { ...state, portfolio: action.payload, lastUpdated: Date.now() };
    case 'SET_TRANSACTIONS': return { ...state, transactions: action.payload };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_LOADING_TX': return { ...state, loadingTx: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    case 'SET_CURRENCY': return { ...state, currency: action.payload };
    case 'SET_SECTION': return { ...state, activeSection: action.payload };
    case 'SET_SELECTED_WALLET': return { ...state, selectedWalletId: action.payload };
    default: return state;
  }
}

const initialState: AppState = {
  wallets: [],
  portfolio: null,
  transactions: [],
  loading: false,
  loadingTx: false,
  error: null,
  currency: 'USD',
  activeSection: 'overview',
  selectedWalletId: null,
  lastUpdated: null,
};

interface AppContextValue extends AppState {
  addWallet: (address: string, name: string, chain: Chain, category?: WalletCategory) => void;
  removeWallet: (id: string) => void;
  refreshPortfolio: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  setCurrency: (c: Currency) => void;
  setSection: (s: Section) => void;
  setSelectedWallet: (id: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const REFRESH_INTERVAL = 60_000;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();
  const userIdRef = useRef<string | null>(null);

  // Track auth state and load wallets from Supabase
  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      const uid = data.user?.id ?? null;
      userIdRef.current = uid;
      if (uid) loadWallets(uid);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      const uid = session?.user?.id ?? null;
      userIdRef.current = uid;
      if (uid) {
        loadWallets(uid);
      } else {
        dispatch({ type: 'SET_WALLETS', payload: [] });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWallets = async (uid: string) => {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load wallets:', error);
      return;
    }

    type WalletRow = { id: string; address: string; name: string; chain: string; category: string; created_at: string };
    const wallets: Wallet[] = (data ?? []).map((w: WalletRow) => ({
      id: w.id,
      address: w.address,
      name: w.name,
      chain: w.chain as Chain,
      category: w.category as WalletCategory | undefined,
      createdAt: new Date(w.created_at).getTime(),
    }));

    dispatch({ type: 'SET_WALLETS', payload: wallets });
  };

  const refreshPortfolio = useCallback(async () => {
    if (!state.wallets.length) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallets: state.wallets }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PortfolioData = await res.json();
      dispatch({ type: 'SET_PORTFOLIO', payload: data });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: String(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.wallets]);

  const refreshTransactions = useCallback(async () => {
    if (!state.wallets.length) return;
    dispatch({ type: 'SET_LOADING_TX', payload: true });
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallets: state.wallets }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Transaction[] = await res.json();
      dispatch({ type: 'SET_TRANSACTIONS', payload: data });
    } catch (err) {
      console.error('Transaction fetch error:', err);
    } finally {
      dispatch({ type: 'SET_LOADING_TX', payload: false });
    }
  }, [state.wallets]);

  // Refresh when wallets change
  useEffect(() => {
    if (!state.wallets.length) return;
    refreshPortfolio();
    refreshTransactions();
  }, [state.wallets]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    if (!state.wallets.length) return;
    refreshTimerRef.current = setInterval(() => {
      refreshPortfolio();
    }, REFRESH_INTERVAL);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [state.wallets, refreshPortfolio]);

  const addWallet = useCallback((address: string, name: string, chain: Chain, category?: WalletCategory) => {
    const uid = userIdRef.current;
    if (!uid) return;

    const id = crypto.randomUUID();
    const wallet: Wallet = {
      id,
      address: address.trim(),
      name: name.trim() || `Wallet ${state.wallets.length + 1}`,
      chain,
      category,
      createdAt: Date.now(),
    };

    // Optimistic update
    dispatch({ type: 'ADD_WALLET', payload: wallet });

    // Persist to Supabase
    supabase.from('wallets').insert({
      id,
      user_id: uid,
      address: wallet.address,
      name: wallet.name,
      chain: wallet.chain,
      category: wallet.category ?? 'hot',
    }).then(({ error }: { error: unknown }) => {
      if (error) console.error('Failed to save wallet:', error);
    });
  }, [state.wallets.length, supabase]);

  const removeWallet = useCallback((id: string) => {
    const uid = userIdRef.current;
    dispatch({ type: 'REMOVE_WALLET', payload: id });
    if (uid) {
      supabase.from('wallets').delete().eq('id', id).eq('user_id', uid).then(({ error }: { error: unknown }) => {
        if (error) console.error('Failed to delete wallet:', error);
      });
    }
  }, [supabase]);

  const setCurrency = useCallback((c: Currency) => dispatch({ type: 'SET_CURRENCY', payload: c }), []);
  const setSection = useCallback((s: Section) => dispatch({ type: 'SET_SECTION', payload: s }), []);
  const setSelectedWallet = useCallback((id: string | null) => dispatch({ type: 'SET_SELECTED_WALLET', payload: id }), []);

  return (
    <AppContext.Provider value={{
      ...state,
      addWallet,
      removeWallet,
      refreshPortfolio,
      refreshTransactions,
      setCurrency,
      setSection,
      setSelectedWallet,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
