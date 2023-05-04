import { SwapTokenMap, Token } from '../types/swap-types';
import { PoolToken } from './types';
import _ from 'lodash';
import { Logger } from '../../utils';
import { tokens } from './shade-rest';
const logger = new Logger('ShadeTokens');
export function toTokenId(shadeToken: PoolToken): Token {
  const symbol = shadeToken.symbol;
  // Hack: easy hack the shadeToken.symbol to match our internal SwapTokenMap
  const token = { SSCRT: SwapTokenMap.SCRT}[symbol] || SwapTokenMap[_.trimStart(symbol.replace('st', '_st$'), 'as').replace('-','').replace('_st$','st')];
  if (!token) {
    logger.debugOnce(`Not mapped ShadeSwap symbol=${symbol}`);
  } else {
    return token;
  }
}


export function getShadeTokenBySymbol (symbol: Token): { id: string, symbol: string, decimals: number} {
  const token = _.find(tokens, (shadeToken) =>
    (_.trimStart(shadeToken.symbol, 's') === symbol
      || _.replace(shadeToken.symbol, '.axl', '') === symbol)
    && shadeToken.flags.includes('swappable')
    && !shadeToken.flags.includes('native'))
  if(!token) {
    throw new Error(`No Shade token wih symbol=${symbol} found in token registry. Fix search probably`);
  }
  return token;
}

