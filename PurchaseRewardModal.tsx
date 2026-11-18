import React from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { RARITY_CONFIG } from '../../data/xianxiaData';
import { EquipItem } from '../../types/game';
import { EquipIcon } from '../EquipIcon';
import { ItemMiniIcon, MiniItemKind } from '../ItemMiniIcon';

export interface RewardEntry {
  label: string;
  amountText: string;
  kind:
    | 'jade'
    | 'bound_jade'
    | 'gold'
    | 'stones'
    | 'comp_stones'
    | 'cultivation'
    | 'vip'
    | 'privilege'
    | 'gear'
    | 'yinyang_token'
    | 'fashion'
    | 'pet'
    | 'treasure'
    | 'artifact'
    | 'wing';
  gear?: EquipItem;
  highlight?: boolean;
}

export interface PurchaseReceipt {
  title: string;
  paymentLabel: string;
  orderNo: string;
  rewards: RewardEntry[];
}

interface PurchaseRewardModalProps {
  receipt: PurchaseReceipt | null;
  onClose: () => void;
}

const mapToMiniKind = (kind: RewardEntry['kind']): MiniItemKind => {
  if (kind === 'gear') return 'red_gear';
  return kind;
};

export const PurchaseRewardModal: React.FC<PurchaseRewardModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
      <div className="xianxia-panel relative w-full max-w-lg rounded-2xl p-5 space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.45)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded bg-red-950/80 border border-amber-400/40 text-amber-200 hover:bg-red-800"
          aria-label="關閉"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Celebratory Header */}
        <div className="text-center space-y-1 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/85 border border-emerald-400/60 text-[11px] font-bold text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            {receipt.paymentLabel} · 交易成功
          </div>
          <h3 className="text-2xl font-bold gold-text-gradient font-xianxia tracking-wider pt-1">
            恭喜道友獲得以下寶物
          </h3>
          <div className="text-[11px] text-amber-200/75 font-num">
            {receipt.title} · 單號 {receipt.orderNo}
          </div>
        </div>

        {/* Reward Items Grid */}
        <div className="grid grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-0.5">
          {receipt.rewards.map((rw, idx) => (
            <div
              key={`${rw.label}_${idx}`}
              className={`xianxia-card rounded-xl p-2.5 flex items-center gap-2.5 border bg-gradient-to-br from-[#2a1046]/90 to-[#160826]/95 ${
                rw.highlight ? 'border-yellow-300 ring-1 ring-amber-400/70 shadow-[0_0_14px_rgba(251,191,36,0.35)]' : 'border-amber-400/45'
              }`}
            >
              {rw.kind === 'gear' && rw.gear ? (
                <EquipIcon
                  slot={rw.gear.slot}
                  rarity={rw.gear.rarity}
                  enhanceLevel={rw.gear.enhanceLevel}
                  size="sm"
                />
              ) : (
                <ItemMiniIcon kind={mapToMiniKind(rw.kind)} size="md" />
              )}

              <div className="min-w-0 flex-1">
                <div
                  className="text-xs font-bold truncate"
                  style={{
                    color:
                      rw.kind === 'gear' && rw.gear
                        ? RARITY_CONFIG[rw.gear.rarity].color
                        : rw.highlight
                        ? '#fde047'
                        : '#fef3c7',
                  }}
                >
                  {rw.label}
                </div>
                <div className="text-xs font-bold text-amber-300 font-num mt-0.5 truncate">
                  {rw.amountText}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl xianxia-btn-gold text-sm font-bold tracking-widest"
        >
          收入囊中
        </button>
      </div>
    </div>
  );
};
