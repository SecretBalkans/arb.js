import { Observable } from 'rxjs';
import { Brand } from '../../ts';
import { Pool } from '../../lib/@osmosis/packages/pools/src';
import { ShadePair } from '../shade';
import BigNumber from 'bignumber.js';

export type Amount = BigNumber;
export type CoinAmount = BigNumber;

export type Token = Brand<string, 'Token'>;
export type Denom = Brand<string, 'Denom'>;
export type NonArbedToken = Brand<string, 'NonArbedToken'>
export type NoIBCToken = Brand<string, 'NoIBCToken'>
export type PoolToken = Token | NonArbedToken | NoIBCToken;
export type PoolId = Brand<string, 'PoolId'>

export function reversePair<T extends SwapToken | PoolToken>(pair: [T, T]): [T, T] {
  return [pair[1], pair[0]];
}

export enum SwapToken {
  SHD = 'SHD',
  'USDC' = 'USDC',
  'USDT' = 'USDT',
  CMST = 'CMST',
  SILK = 'SILK',
  stkdSCRT = 'stkdSCRT',
  stkATOM = 'stkATOM',
  SCRT = 'SCRT',
  stATOM = 'stATOM',
  IST = 'IST',
  ATOM = 'ATOM',
  stOSMO = 'stOSMO',
  stINJ = 'stINJ',
  INJ = 'INJ',
  stLUNA = 'stLUNA',
  LUNA = 'LUNA',
  OSMO = 'OSMO',
  JUNO = 'JUNO',
  stJUNO = 'stJUNO',
  JKL = 'JKL',
  BLD = 'BLD',
  SIENNA = 'SIENNA'
}

// noinspection JSUnusedLocalSymbols
function isArbedToken(token: Token | NonArbedToken): token is Token {
  return !!SwapTokenMap[token as Token];
}

export const SwapTokenMap: Record<SwapToken, Token> = {
  SHD: SwapToken.SHD as Token,
  SILK: SwapToken.SILK as Token,
  CMST: SwapToken.CMST as Token,
  stkdSCRT: SwapToken.stkdSCRT as Token,
  SCRT: SwapToken.SCRT as Token,
  stATOM: SwapToken.stATOM as Token,
  IST: SwapToken.IST as Token,
  ATOM: SwapToken.ATOM as Token,
  stOSMO: SwapToken.stOSMO as Token,
  USDT: SwapToken.USDT as Token,
  USDC: SwapToken.USDC as Token,
  OSMO: SwapToken.OSMO as Token,
  JUNO: SwapToken.JUNO as Token,
  stJUNO: SwapToken.stJUNO as Token,
  SIENNA: SwapToken.SIENNA as Token,
  JKL: SwapToken.JKL as Token,
  BLD: SwapToken.BLD as Token,
  INJ: SwapToken.INJ as Token,
  stINJ: SwapToken.stINJ as Token,
  LUNA: SwapToken.LUNA as Token,
  stLUNA: SwapToken.stLUNA as Token,
  stkATOM: SwapToken.stkATOM as Token,
};

export interface IPool<T> {
  poolId: PoolId;
  token0Amount: CoinAmount;
  token1Amount: CoinAmount;
  token0Id: PoolToken;
  token1Id: PoolToken;
  dex: DexProtocolName;
  internalPool: T;
}

export type DexProtocolName = 'osmosis' | 'shade';

export interface IRouteSegment<T extends DexPool> {
  pool: IPool<T>;
}

export interface ICalculatedRouteSegment<T extends DexPool> extends IRouteSegment<T> {
  inputTokenId: Token;
  outputTokenId: Token;
  amountIn: Amount;
  amountOut: Amount;
  fee: Amount;
  priceImpact: Amount;
}

export type IRoute<T extends DexPool> = IRouteSegment<T>[];
export type DexPool = Pool | ShadePair;

export abstract class DexProtocol<T extends DexPool> implements ICanSwap<T>, ILivePoolStore<T> {
  name: DexProtocolName;
  pools: IPool<T>[];

  abstract calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, pools: T[]): { route: IRoute<T>; amountOut: Amount } | null;

  calcSwap(amountIn: Amount, [tokenInId, tokenOutId]: [Token, Token], pools): { route?: IRoute<T>; amountOut?: Amount, internalSwapError: Error | null } {
    try {
      const result = this.calcSwapWithPools(amountIn, tokenInId, tokenOutId, pools);
      if (!result) {
        // noinspection ExceptionCaughtLocallyJS
        throw new Error('No swap route');
      }
      return {
        internalSwapError: null,
        ...result,
      };
    } catch (err) {
      return {
        internalSwapError: new Error(`SwapError ${amountIn?.toString()} ${tokenInId} > ${tokenOutId} : ${err.message}\n\r${err.stack}`),
      };
    }
  }

  abstract subscribeToPoolsUpdate(): Observable<{ pools: IPool<T>[]; height: number }>

  abstract getPoolsMap(pairs: [SwapToken, SwapToken][]): PoolId[];
}

export interface ICanSwap<T extends DexPool> {
  calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, pools: T[]): { route: IRoute<T>, amountOut: Amount };

  getPoolsMap(pairs: [SwapToken, SwapToken][]): PoolId[];
}

export interface ILivePoolStore<T extends DexPool> {
  name: DexProtocolName,
  pools: IPool<T>[],

  subscribeToPoolsUpdate(): Observable<{ pools: IPool<T>[], height: number }>;
}
