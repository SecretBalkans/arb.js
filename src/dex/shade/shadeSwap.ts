import { Amount, DexProtocol, DexProtocolName, IPool, IRoute, PoolId, Token } from '../types/swap-types';
import { getShadeTokenBySymbol, toTokenId } from './tokens';
import { calculateBestShadeSwapRoutes } from './shade-calc';
import { convertCoinFromUDenomV2 } from '../../utils';
import { Observable } from 'rxjs';
import createCosmosObserver from '../utils/cosmosObserver';
import { getShadePairs, ShadePair } from './shade-rest';
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
    poolsHint.length > 10 && console.time('Shade')
    const [route] = calculateBestShadeSwapRoutes({
      inputTokenAmount: amountIn.multipliedBy(10 ** startingToken.decimals),
      startingTokenId: startingToken.id,
      endingTokenId: endingToken.id,
      isReverse: false,
      maxHops: 7,
      pools: _.map(poolsHint, p=> (p.rawInfo?.id || p['id']) as PoolId)
    });
    poolsHint.length > 10 && console.timeEnd('Shade')
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
}
