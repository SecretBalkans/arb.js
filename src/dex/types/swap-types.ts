import BigNumber from "bignumber.js";
import { Observable } from 'rxjs';
import { Brand } from "../../ts";

export type Amount = BigNumber;

export type Token = Brand<string, "Token">;
export type Denom = Brand<string, "Denom">;
export type NonArbedToken = Brand<string, 'NonArbedToken'>
export type NoIBCToken = Brand<string, 'NoIBCToken'>
export type PoolToken = Token | NonArbedToken | NoIBCToken;
export type PoolId = Brand<string, "PoolId">

export function reversePair<T extends SwapToken | PoolToken>(pair: [T,T]): [T,T] {
  return [pair[1],pair[0]];
}

export enum SwapToken {
  SHD = 'SHD',
  'USDC' = 'USDC',
  'USDT' = 'USDT',
  CMST = "CMST",
  SILK = "SILK",
  stkdSCRT = "stkdSCRT",
  SCRT = "SCRT",
  stATOM = "stATOM",
  IST = "IST",
  ATOM = "ATOM",
  stOSMO = "stOSMO",
  OSMO = "OSMO",
  JUNO = "JUNO",
  stJUNO = "stJUNO",
  JKL = "JKL",
  BLD = "BLD",
  SIENNA = "SIENNA"
}

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
  BLD: SwapToken.BLD as Token
}
export interface IPool {
  poolId: PoolId;
  token0Amount: Amount;
  token1Amount: Amount;
  token0Id: PoolToken;
  token1Id: PoolToken;
  dex: DexProtocolName
}

export type DexProtocolName = 'osmosis' | 'shade';

export interface IRouteSegment {
  poolId: string;
}

export interface ICalculatedRouteSegment extends IRouteSegment {
  inputTokenId: Token;
  outputTokenId: Token;
  amountIn: Amount;
  amountOut: Amount;
  fee: Amount;
  priceImpact: Amount;
}

export type IRoute = IRouteSegment[];

export abstract class DexProtocol implements ICanSwap, ILivePoolStore{
  name: DexProtocolName;
  pools: IPool[];

  calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, pools: IPool[]): { route: IRoute; amountOut: Amount } {
    throw new Error('Implement me');
  }

  calcSwap(amountIn: Amount, [tokenInId, tokenOutId]: [Token, Token]): { route: IRoute; amountOut: Amount } {
    return this.calcSwapWithPools(amountIn, tokenInId, tokenOutId, this.pools);
  }

  subscribeToPoolsUpdate(): Observable<{ pools: IPool[]; height: number }> {
    throw new Error('Implement me');
  }

}

export interface ICanSwap {
  calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, pools: IPool[]): { route: IRoute, amountOut: Amount};
}

export interface ILivePoolStore {
  name: DexProtocolName,
  pools: IPool[],
  subscribeToPoolsUpdate (): Observable<{ pools: IPool[], height: number}>;
}
