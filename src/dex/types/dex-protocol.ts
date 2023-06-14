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
import {Logger} from "../../utils";

export abstract class DexProtocol<T extends DexProtocolName> implements ICanSwap<T>, ILivePoolStore<T> {
  name: DexProtocolName;
  pools: IPool<PoolInfo<T>>[];

  rawPools: PoolInfo<T>[];
  isFetchingPools: any;
  protected abstract logger: Logger;

  abstract calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, poolsHint: Route<T>): { route: Route<T>; amountOut: Amount } | null;
  abstract fetchRawPools(): Promise<PoolInfo<T>[]>;

  public subscribeToPoolsUpdate(retryTime = 500): Observable<{ pools: IPool<PoolInfo<T>> [], height: number }> {
    return new Observable<{ pools: IPool<PoolInfo<T>>[], height: number }>(observer => {
      this.subscribeToDexHeights().subscribe(({height: blockHeight}) => {
        if (!this.isFetchingPools) {
          this.isFetchingPools = true
          const p = performance.now()
          this.fetchRawPools()
            .then(rawPools => {
              this.updateRawPools(rawPools)
              this.isFetchingPools = false;
              this.logger.log(`${this.name}_pools`, performance.now() - p, `(${rawPools.length})`);
              setImmediate(() => {
                observer.next({
                  pools: this.pools,
                  height: blockHeight,
                });
              })
            }).catch(err => {
            this.logger.log(`${this.name}_pools`, performance.now() - p);
            this.isFetchingPools = false;
            this.logger.debug(err.message);
          });
        }
      }, this.logger.error.bind(this.logger));
    });
  }

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

  abstract updateRawPools(rawPools: PoolInfo<T>[]);

  abstract subscribeToDexHeights(): Observable<{ height: number }>

  abstract getPoolsMap(pairs: [SwapToken, SwapToken][]): PoolId[];
}
