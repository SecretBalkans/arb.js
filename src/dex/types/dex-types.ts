import {Observable} from 'rxjs';
import {Pool} from '../../lib/@osmosis/packages/pools/src';
import {ShadePair} from '../shade/shade-api-utils';
import BigNumber from 'bignumber.js';
import {OsmosisRoute} from '../osmosis/types';
import {SerializedShadeRouteSegmentInfo, ShadeRouteSegmentInfo} from "../shade/types";

export type Amount = BigNumber;
export type CoinAmount = BigNumber;
declare const brand: unique symbol;

export type Brand<T, TBrand extends string> = T & {
  [brand]: TBrand;
}

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
  'WETH' = 'WETH',
  'WBTC' = 'WBTC',
  CMST = 'CMST',
  SILK = 'SILK',
  stkdSCRT = 'stkdSCRT',
  stkATOM = 'stkATOM',
  SCRT = 'SCRT',
  stATOM = 'stATOM',
  IST = 'IST',
  ATOM = 'ATOM',
  qATOM = 'qATOM',
  stOSMO = 'stOSMO',
  stINJ = 'stINJ',
  INJ = 'INJ',
  KUJI = 'KUJI',
  USK = 'USK',
  pSTAKE = 'pSTAKE',
  QCK = 'QCK',
  STRD = 'STRD',
  OSMO = 'OSMO',
  JUNO = 'JUNO',
  stJUNO = 'stJUNO',
  BLD = 'BLD'
}

// noinspection JSUnusedLocalSymbols
export function isSwapToken(token: string | PoolToken): token is SwapToken {
  return !!SwapTokenMap[token as SwapToken];
}

export const SwapTokenMap: Record<SwapToken, Token> = {
  SHD: SwapToken.SHD as Token,
  SILK: SwapToken.SILK as Token,
  CMST: SwapToken.CMST as Token,
  stkdSCRT: SwapToken.stkdSCRT as Token,
  SCRT: SwapToken.SCRT as Token,
  stATOM: SwapToken.stATOM as Token,
  qATOM: SwapToken.qATOM as Token,
  IST: SwapToken.IST as Token,
  ATOM: SwapToken.ATOM as Token,
  stOSMO: SwapToken.stOSMO as Token,
  USDT: SwapToken.USDT as Token,
  USDC: SwapToken.USDC as Token,
  WETH: SwapToken.WETH as Token,
  WBTC: SwapToken.WBTC as Token,
  OSMO: SwapToken.OSMO as Token,
  JUNO: SwapToken.JUNO as Token,
  stJUNO: SwapToken.stJUNO as Token,
  BLD: SwapToken.BLD as Token,
  INJ: SwapToken.INJ as Token,
  USK: SwapToken.USK as Token,
  KUJI : SwapToken.KUJI as Token,
  pSTAKE : SwapToken.pSTAKE as Token,
  QCK : SwapToken.QCK as Token,
  STRD : SwapToken.STRD as Token,
  stINJ: SwapToken.stINJ as Token,
  stkATOM: SwapToken.stkATOM as Token,
};

export interface IPool<T extends DexPool> {
  poolId: PoolId;
  token0Amount: CoinAmount;
  token1Amount: CoinAmount;
  token0Id: PoolToken;
  token1Id: PoolToken;
  dex: DexProtocolName;
  internalPool: T;
}

export type DexProtocolName = 'shade' | 'osmosis';

export function isDexProtocolName(dexName: string): dexName is DexProtocolName {
  return ['osmosis', 'shade'].includes(dexName);
}

export type Route<T extends DexProtocolName> = T extends 'osmosis' ? OsmosisRoute : (ShadeRouteSegmentInfo[])

export type SerializedRoute<T extends DexProtocolName> = T extends 'osmosis' ? OsmosisRoute : (SerializedShadeRouteSegmentInfo[])

export type DexPool = Pool | ShadePair;
export type PoolInfo<T extends DexProtocolName> = T extends 'osmosis' ? Pool : ShadePair;

export interface ICanSwap<T extends DexProtocolName> {
  calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, pools: Route<T>): { route: Route<T>, amountOut: Amount };

  getPoolsMap(pairs: [SwapToken, SwapToken][]): PoolId[];
}

export interface ILivePoolStore<T extends DexProtocolName> {
  name: DexProtocolName,
  pools: IPool<PoolInfo<T>>[],

  subscribeToPoolsUpdate(): Observable<{ pools: IPool<PoolInfo<T>>[], height: number }>;
}
