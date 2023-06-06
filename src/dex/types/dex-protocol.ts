import {Observable} from "rxjs";
import {
  Amount,
  DexProtocolName,
  ICanSwap,
  ILivePoolStore,
  IPool,
  PoolId,
  PoolInfo,
  Route,
  SwapToken,
  Token
} from "./dex-types";

export abstract class DexProtocol<T extends DexProtocolName> implements ICanSwap<T>, ILivePoolStore<T> {
  name: DexProtocolName;
  pools: IPool<PoolInfo<T>>[];

  abstract calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, poolsHint: Route<T>): { route: Route<T>; amountOut: Amount } | null;

  calcSwap(amountIn: Amount, [tokenInId, tokenOutId]: [Token, Token], pools): { route?: Route<T>; amountOut?: Amount, internalSwapError: Error | null } {
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

  abstract subscribeToPoolsUpdate(): Observable<{ pools: IPool<PoolInfo<T>>[]; height: number }>

  abstract subscribeToDexHeights(): Observable<{ height: number }>

  abstract getPoolsMap(pairs: [SwapToken, SwapToken][]): PoolId[];
}
