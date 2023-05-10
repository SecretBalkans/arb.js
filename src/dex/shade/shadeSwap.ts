import {
  Amount,
  DexProtocol,
  DexProtocolName,
  IPool,
  IRoute,
  PoolId,
  SwapToken,
  SwapTokenMap,
  Token,
} from '../types/dex-types';
import { getShadeTokenBySymbol, toTokenId } from './tokens';
import { calculateBestShadeSwapRoutes, findShadePaths } from './shade-calc';
import { convertCoinFromUDenomV2 } from '../../utils';
import { Observable } from 'rxjs';
import createCosmosObserver from '../utils/cosmosObserver';
import { getShadePairs, ShadePair, TheStore } from './shade-rest';
import bigInteger from 'big-integer';
import _ from 'lodash';

export default class ShadeSwap extends DexProtocol<ShadePair> {
  public name = 'shade' as DexProtocolName;
  public pools: IPool<ShadePair>[];

  constructor(public readonly rpcEndpoint: string) {
    super();
  }

  public override calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, poolsHint: ShadePair[]): { route: IRoute<ShadePair>; amountOut: Amount } | null {
    const startingToken = getShadeTokenBySymbol(tokenInId);
    const endingToken = getShadeTokenBySymbol(tokenOutId);
    const [route] = calculateBestShadeSwapRoutes({
      inputTokenAmount: amountIn.multipliedBy(10 ** startingToken.decimals),
      startingTokenId: startingToken.id,
      endingTokenId: endingToken.id,
      isReverse: false,
      maxHops: 5,
      // TODO: there is a limit on secret network for max hops length.
      //  we need to split big routes into two smaller ones and execute it into
      //  two messages and thus support bigger (7-8-more?) routes
      //  as they can often give better arb
      pools: _.map(poolsHint, p=> (p.rawInfo?.id || p['id']) as PoolId)
    });
    return route ? {
      route: route.route.map(r => ({
        pool: r,
      })),
      amountOut: convertCoinFromUDenomV2(route.quoteOutputAmount, endingToken.decimals),
    } : null;
  }

  public override subscribeToPoolsUpdate(retryTime = 300): Observable<{ pools: IPool<ShadePair>[]; height: number }> {
    return new Observable<{ pools: IPool<ShadePair>[], height: number }>(observer => {
      createCosmosObserver(this.rpcEndpoint, retryTime).subscribe(blockHeight => getShadePairs()
        .then(shadePairs => {
          const latestPools = shadePairs.map(sp => ({
            poolId: sp.name as PoolId,
            dex: 'shade' as DexProtocolName,
            token0Id: toTokenId(sp.token0),
            token0Amount: bigInteger(sp.token0.amount),
            token1Id: toTokenId(sp.token1),
            token1Amount: bigInteger(sp.token1.amount),
            internalPool: sp,
          }));
          this.pools = latestPools;
          return observer.next({
            pools: latestPools,
            height: blockHeight,
          });
        }).catch(console.error), console.error);
    });
  }

  getPoolsMap(pairs: [SwapToken, SwapToken][]): PoolId[] {
    const store = TheStore(), pools = store.pools;
    return _.union(_.flatMap(pairs,([token1, token2]) => {
      const startingToken = getShadeTokenBySymbol(SwapTokenMap[token1]);
      const endingToken = getShadeTokenBySymbol(SwapTokenMap[token2]);
      return _.flatten(findShadePaths({
        startingTokenId: startingToken.id,
        endingTokenId: endingToken.id,
        maxHops: 5,
        pools,
      }));
    }));
  }
}
