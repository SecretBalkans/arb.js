import BigNumber from 'bignumber.js';

export const convertCoinToUDenomV2 = (e, t) => typeof e == 'string' || typeof e == 'number' ? BigNumber(e).multipliedBy(BigNumber(10).pow(t)).toFixed(0) : e.multipliedBy(BigNumber(10).pow(t)).toFixed(0);
export const convertCoinFromUDenomV2 = (e,t)=>(BigNumber.config({
  DECIMAL_PLACES: 18
}),BigNumber(e).dividedBy(BigNumber(10).pow(t)))
