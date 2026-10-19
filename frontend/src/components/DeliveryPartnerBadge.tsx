import React from 'react';
import { DeliveryPartner } from '../types';

interface DeliveryPartnerBadgeProps {
  partner?: DeliveryPartner;
  partnerOrderId?: string;
  partnerPickupCode?: string;
  size?: 'sm' | 'md' | 'lg';
  showCode?: boolean;
}

export const DeliveryPartnerBadge: React.FC<DeliveryPartnerBadgeProps> = ({
  partner = 'direct',
  partnerOrderId,
  partnerPickupCode,
  size = 'md',
  showCode = true
}) => {
  const getPartnerMeta = () => {
    switch (partner) {
      case 'zomato':
        return {
          name: 'ZOMATO',
          bg: 'bg-rose-950/80',
          text: 'text-rose-300',
          border: 'border-rose-600/70',
          dot: 'bg-rose-500',
          iconText: '🔴'
        };
      case 'swiggy':
        return {
          name: 'SWIGGY',
          bg: 'bg-orange-950/80',
          text: 'text-orange-300',
          border: 'border-orange-600/70',
          dot: 'bg-orange-500',
          iconText: '🟠'
        };
      case 'ondc':
        return {
          name: 'ONDC',
          bg: 'bg-blue-950/80',
          text: 'text-blue-300',
          border: 'border-blue-600/70',
          dot: 'bg-blue-500',
          iconText: '🔵'
        };
      case 'magicpin':
        return {
          name: 'MAGICPIN',
          bg: 'bg-purple-950/80',
          text: 'text-purple-300',
          border: 'border-purple-600/70',
          dot: 'bg-purple-500',
          iconText: '🟣'
        };
      default:
        return {
          name: 'DIRECT',
          bg: 'bg-emerald-950/80',
          text: 'text-emerald-300',
          border: 'border-emerald-600/70',
          dot: 'bg-emerald-500',
          iconText: '🟢'
        };
    }
  };

  const meta = getPartnerMeta();
  const isSm = size === 'sm';

  return (
    <div className="inline-flex items-center space-x-1.5 flex-wrap gap-y-1">
      {/* Brand & Partner Order Code Tag */}
      <span
        className={`inline-flex items-center space-x-1 rounded-lg font-bold border ${meta.bg} ${meta.text} ${meta.border} ${
          isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
        } shadow-sm`}
      >
        <span className="text-[10px]">{meta.iconText}</span>
        <span>{meta.name}</span>
        {partnerOrderId && (
          <>
            <span className="opacity-40">|</span>
            <span className="font-mono">{partnerOrderId}</span>
          </>
        )}
      </span>

      {/* High-Visibility Rider Pickup Code / OTP */}
      {showCode && partnerPickupCode && (
        <span
          className={`inline-flex items-center space-x-1 rounded-lg font-mono font-black bg-amber-400 text-slate-950 border border-amber-300 ${
            isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          } shadow-sm`}
          title="Rider Pickup Verification Code (OTP)"
        >
          <span className="text-[10px] tracking-tighter opacity-80 uppercase">OTP</span>
          <span>{partnerPickupCode}</span>
        </span>
      )}
    </div>
  );
};
