'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { detectChain } from '@/lib/chains';
import { Chain } from '@/types';
import { CHAIN_CONFIG } from '@/lib/chains';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CHAINS: Chain[] = ['ethereum', 'bsc', 'base', 'solana'];

export function AddWalletModal({ open, onClose }: Props) {
  const { addWallet } = useApp();
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [chain, setChain] = useState<Chain>('ethereum');
  const [error, setError] = useState('');

  const detectedChain = address ? detectChain(address) : null;
  const isValidAddress = detectedChain !== null;
  const isSolana = detectedChain === 'solana';

  const handleAddressChange = (val: string) => {
    setAddress(val);
    setError('');
    const detected = detectChain(val.trim());
    if (detected) {
      if (detected === 'solana') setChain('solana');
      else setChain('ethereum');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();
    const detected = detectChain(trimmed);
    if (!detected) {
      setError('Invalid wallet address. Enter a valid Ethereum (0x...) or Solana address.');
      return;
    }
    addWallet(trimmed, name.trim(), chain);
    setAddress('');
    setName('');
    setChain('ethereum');
    setError('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Wallet">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Address */}
        <div>
          <label className="block text-xs text-muted font-medium mb-1.5">
            Wallet Address
            <span className="ml-1.5 text-muted/60 font-normal">(hot or cold — Ledger, Trezor, etc.)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={address}
              onChange={e => handleAddressChange(e.target.value)}
              placeholder="0x... or Solana address"
              className="w-full px-3 py-2.5 bg-bg-tertiary border border-border rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors pr-9"
              autoFocus
            />
            {address && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidAddress
                  ? <CheckCircle2 size={16} className="text-success" />
                  : <AlertCircle size={16} className="text-danger" />
                }
              </span>
            )}
          </div>
          {address && isValidAddress && (
            <p className="mt-1 text-xs text-success">
              Detected: {detectedChain === 'solana' ? 'Solana' : 'EVM'} address · read-only, no private key needed
            </p>
          )}
        </div>

        {/* Chain selector (only for EVM) */}
        {!isSolana && (
          <div>
            <label className="block text-xs text-muted font-medium mb-1.5">Chain</label>
            <div className="grid grid-cols-3 gap-2">
              {CHAINS.filter(c => c !== 'solana').map(c => {
                const cfg = CHAIN_CONFIG[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChain(c)}
                    className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      chain === c
                        ? 'border-accent bg-accent/15 text-white'
                        : 'border-border bg-bg-tertiary text-muted hover:text-white hover:border-border-light'
                    }`}
                  >
                    <span className="text-base font-bold" style={{ color: cfg.color }}>
                      {c === 'ethereum' ? '◆' : c === 'bsc' ? '●' : '■'}
                    </span>
                    {cfg.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs text-muted font-medium mb-1.5">Wallet Name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`My ${isSolana ? 'Solana' : CHAIN_CONFIG[chain].name} Wallet`}
            maxLength={30}
            className="w-full px-3 py-2.5 bg-bg-tertiary border border-border rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={!address}>
            Add Wallet
          </Button>
        </div>
      </form>
    </Modal>
  );
}
