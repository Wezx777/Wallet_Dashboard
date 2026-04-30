'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { detectAddressType, AddressType, CHAIN_CONFIG, EVM_CHAINS } from '@/lib/chains';
import { Chain, WalletCategory } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES: { value: WalletCategory; label: string; icon: string }[] = [
  { value: 'cold',     label: 'Cold Wallet', icon: '🔒' },
  { value: 'hot',      label: 'Hot Wallet',  icon: '📱' },
  { value: 'exchange', label: 'Exchange',    icon: '🏦' },
  { value: 'dex',      label: 'DEX / DeFi', icon: '🔄' },
  { value: 'other',    label: 'Outro',       icon: '📁' },
];

const ADDRESS_TYPE_LABEL: Record<AddressType, string> = {
  evm:    'Endereço EVM — seleciona a chain abaixo',
  solana: 'Endereço Solana detectado',
  tron:   'Endereço Tron detectado',
};

export function AddWalletModal({ open, onClose }: Props) {
  const { addWallet } = useApp();
  const [address, setAddress]     = useState('');
  const [name, setName]           = useState('');
  const [chain, setChain]         = useState<Chain>('ethereum');
  const [category, setCategory]   = useState<WalletCategory>('hot');
  const [error, setError]         = useState('');

  const trimmed       = address.trim();
  const addrType      = trimmed ? detectAddressType(trimmed) : null;
  const isValid       = addrType !== null;
  const showChainPicker = addrType === 'evm';

  const handleAddressChange = (val: string) => {
    setAddress(val);
    setError('');
    const type = detectAddressType(val.trim());
    if (type === 'solana') setChain('solana');
    else if (type === 'tron') setChain('tron');
    else if (type === 'evm' && (chain === 'solana' || chain === 'tron')) setChain('ethereum');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const type = detectAddressType(trimmed);
    if (!type) {
      setError('Endereço inválido. Usa um endereço EVM (0x…), Solana ou Tron.');
      return;
    }
    addWallet(trimmed, name.trim(), chain, category);
    setAddress(''); setName(''); setChain('ethereum'); setCategory('hot'); setError('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Adicionar Carteira">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Address */}
        <div>
          <label className="block text-xs text-muted font-medium mb-1.5">
            Endereço da Carteira
            <span className="ml-1.5 text-muted/60 font-normal">(hot, cold, Ledger, Trezor…)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={address}
              onChange={e => handleAddressChange(e.target.value)}
              placeholder="0x… ou endereço Solana / Tron"
              className="w-full px-3 py-2.5 bg-bg-tertiary border border-border rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors pr-9"
              autoFocus
            />
            {address && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValid
                  ? <CheckCircle2 size={16} className="text-success" />
                  : <AlertCircle size={16} className="text-danger" />
                }
              </span>
            )}
          </div>
          {address && isValid && addrType && (
            <p className="mt-1 text-xs text-success">
              {ADDRESS_TYPE_LABEL[addrType]} · só leitura, sem chave privada
            </p>
          )}
        </div>

        {/* Chain selector — only for EVM addresses */}
        {showChainPicker && (
          <div>
            <label className="block text-xs text-muted font-medium mb-1.5">Chain</label>
            <div className="grid grid-cols-4 gap-1.5">
              {EVM_CHAINS.map(c => {
                const cfg = CHAIN_CONFIG[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChain(c)}
                    className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                      chain === c
                        ? 'border-accent bg-accent/15 text-white'
                        : 'border-border bg-bg-tertiary text-muted hover:text-white hover:border-border-light'
                    }`}
                  >
                    <span className="text-sm font-bold leading-none" style={{ color: cfg.color }}>
                      {cfg.icon}
                    </span>
                    <span className="truncate w-full text-center leading-tight mt-0.5" style={{ fontSize: '10px' }}>
                      {cfg.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs text-muted font-medium mb-1.5">Nome (opcional)</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`A minha carteira ${CHAIN_CONFIG[chain].name}`}
            maxLength={30}
            className="w-full px-3 py-2.5 bg-bg-tertiary border border-border rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs text-muted font-medium mb-1.5">Categoria</label>
          <div className="grid grid-cols-5 gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`flex flex-col items-center gap-1 px-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                  category === cat.value
                    ? 'border-accent bg-accent/15 text-white'
                    : 'border-border bg-bg-tertiary text-muted hover:text-white hover:border-border-light'
                }`}
              >
                <span className="text-base leading-none">{cat.icon}</span>
                <span className="leading-tight text-center" style={{ fontSize: '9px' }}>{cat.label}</span>
              </button>
            ))}
          </div>
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
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={!address || !isValid}>
            Adicionar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
