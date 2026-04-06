import React from 'react';
import './PromoSection.css';

const PromoSection = ({
  availablePromos = [],
  promoInput,
  setPromoInput,
  appliedPromo,
  promoLoading,
  promoError,
  onApply,
  onRemove,
  onPickCode,
}) => {
  return (
    <div className='promo-section'>
      <div className='promo-section-head'>
        <h4>Promo codes</h4>
        <span>Save more on this order</span>
      </div>

      {availablePromos.length > 0 && (
        <div className='promo-chip-wrap'>
          {availablePromos.map((promo) => (
            <button
              key={promo.code}
              type='button'
              className='promo-chip'
              disabled={!!appliedPromo}
              onClick={() => onPickCode?.(promo.code)}
              title={promo.type === 'percent'
                ? `${promo.value}% off${promo.minOrder > 0 ? ` · Min AED ${promo.minOrder}` : ''}`
                : `AED ${promo.value} off${promo.minOrder > 0 ? ` · Min AED ${promo.minOrder}` : ''}`}
            >
              <span className='promo-chip-code'>{promo.code}</span>
              <span className='promo-chip-meta'>
                {promo.type === 'percent' ? `${promo.value}% off` : `AED ${promo.value} off`}
                {promo.minOrder > 0 ? ` · Min AED ${promo.minOrder}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className='promo-entry'>
        <div className='promo-entry-input'>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <path d='M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z' />
            <line x1='7' y1='7' x2='7.01' y2='7' />
          </svg>
          <input
            type='text'
            placeholder='Enter promo code...'
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            disabled={!!appliedPromo}
            onKeyDown={(e) => e.key === 'Enter' && !appliedPromo && onApply?.()}
          />
          {appliedPromo && (
            <button type='button' className='promo-entry-remove' onClick={onRemove}>
              Remove
            </button>
          )}
        </div>
        <button
          type='button'
          className='promo-entry-btn'
          onClick={onApply}
          disabled={!!appliedPromo || promoLoading}
        >
          {promoLoading ? '...' : appliedPromo ? 'Applied' : 'Apply'}
        </button>
      </div>

      {promoError && <p className='promo-msg promo-msg-error'>{promoError}</p>}
      {appliedPromo && <p className='promo-msg promo-msg-success'>🎉 {appliedPromo.message}</p>}
    </div>
  );
};

export default PromoSection;
