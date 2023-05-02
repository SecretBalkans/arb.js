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
export enum SwapTokens {
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
export const SwapTokenMap: Record<SwapTokens, Token> = {
  SHD: SwapTokens.SHD as Token,
  SILK: SwapTokens.SILK as Token,
  CMST: SwapTokens.CMST as Token,
  stkdSCRT: SwapTokens.stkdSCRT as Token,
  SCRT: SwapTokens.SCRT as Token,
  stATOM: SwapTokens.stATOM as Token,
  IST: SwapTokens.IST as Token,
  ATOM: SwapTokens.ATOM as Token,
  stOSMO: SwapTokens.stOSMO as Token,
  USDT: SwapTokens.USDT as Token,
  USDC: SwapTokens.USDC as Token,
  OSMO: SwapTokens.OSMO as Token,
  JUNO: SwapTokens.JUNO as Token,
  stJUNO: SwapTokens.stJUNO as Token,
  SIENNA: SwapTokens.SIENNA as Token,
  JKL: SwapTokens.JKL as Token,
  BLD: SwapTokens.BLD as Token
}
export interface IPool {
  poolId: PoolId;
  token0Amount: Amount;
  token1Amount: Amount;
  token0Id: PoolToken;
  token1Id: PoolToken;
  dex: DexProtocol
}

export type DexProtocol = 'osmosis' | 'shade';

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


export interface ICanSwap {
  calculateSwapRoutesWithManyPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, pools: IPool[]): { route: IRoute, amountOut: Amount};
}

export interface ILivePoolStore {
  name: DexProtocol,
  subscribeToPoolsUpdate (): Observable<{ pools: IPool[], height: number}>;
}
