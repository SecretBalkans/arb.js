import {PoolId, SwapTokenMap, Token} from '../types/dex-types';
import { SnipPoolToken } from './types';
import _ from 'lodash';
import { Logger } from '../../utils';
import { tokens, pairs } from './shade-api-utils';

const logger = new Logger('ShadeTokens');

export function toTokenId(shadeToken: SnipPoolToken): Token {
  const symbol = shadeToken.symbol;
  // Hack: easy hack the shadeToken.symbol to match our internal SwapTokenMap
  const token = { SSCRT: SwapTokenMap.SCRT }[symbol] || SwapTokenMap[_.trimStart(symbol.replace('st', '_st$'), 'as').replace('-', '').replace('_st$', 'st')];
  if (!token) {
    logger.debugOnce(`Not mapped ShadeSwap symbol=${symbol}`);
  } else {
    return token;
  }
}

export function getShadeTokenById(id: string) {
  const token = _.find(tokens, (shadeToken) => {
    return shadeToken.id === id
      &&
      // Check that it is used in the shade pairs
      !!_.find(pairs, (d) => [d.token_0, d.token_1].includes(id));
  });
  if (!token) {
    throw new Error(`No Shade token wih id=${id} found in token & pairs registry. Fix search probably`);
  }
  return token;

}

function getShadeTokenInfoById(id: string) {
  const token = _.find(tokens, (shadeToken) => {
    return shadeToken.id === id
      &&
      // Check that it is used in the shade pairs
      !!_.find(pairs, (d) => [d.token_0, d.token_1].includes(id));
  });
  if (!token) {
    throw new Error(`No Shade token wih id=${id} found in token & pairs registry. Fix search probably`);
  }
  return token;
}

export function extractShadeTokenSymbolById(id: string) {
  const token = getShadeTokenInfoById(id);
  return extractShadeTokenSymbol(token);

}

function extractShadeTokenSymbol(shadeToken) {
  return _.trimStart(shadeToken.symbol.replace('stk', '_stk^').replace('st', '_st$'), 'as').replace('.axl','').replace('-', '').replace('_st$', 'st').replace('_stk^', 'stk');
}

export function getShadeTokenBySymbol(symbol: Token): { id: PoolId, symbol: string, decimals: number } {
  const token = _.find(tokens, (shadeToken) => {
      return extractShadeTokenSymbol(shadeToken) === symbol
        &&
        // Check that it is used in the shade pairs
        !!_.find(pairs, (d) => [d.token_0, d.token_1].includes(shadeToken.id));
    });
  if (!token) {
    throw new Error(`No Shade token wih symbol=${symbol} found in token & pairs registry. Fix search probably`);
  }
  return token;
}

