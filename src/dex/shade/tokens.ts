import { SwapTokenMap, Token } from '../types/swap-types';
import { PoolToken } from './types';
import _ from 'lodash';
import { Logger } from '../../utils';
const logger = new Logger('ShadeTokens');
export function toTokenId(shadeToken: PoolToken): Token {
  const symbol = shadeToken.symbol;
  const token = { SSCRT: SwapTokenMap.SCRT}[symbol] || SwapTokenMap[_.trimStart(symbol.replace('st', '_st$'), 'as').replace('-','').replace('_st$','st')];
  if (token) {
    return token;
  } else {
    logger.debugOnce(`Not mapped ShadeSwap symbol=${symbol}`);
  }
}
