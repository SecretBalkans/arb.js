import { Amount, Denom, DexProtocol, DexProtocolName, IPool, IRoute, PoolId, Token } from '../types/swap-types';
import { getTokenDenom, toTokenId } from './tokens';
import { calculateBestOsmosisSwapRoute } from './osmosis-calc';
import { getOsmoPools } from './osmosis-rest';
import { convertCoinFromUDenomV2 } from '../../utils';
import { Observable } from 'rxjs';
import createCosmosObserver from '../utils/cosmosObserver';
import { Pool } from '../../lib/@osmosis/packages/pools/src';
import bigInteger from 'big-integer';

export default class OsmosisSwap extends DexProtocol<Pool> {
  public name = 'osmosis' as DexProtocolName;
  public pools: IPool<Pool>[];

  constructor(public readonly rpcEndpoint: string) {
    super();
  }

  public override calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, poolsHint: Pool[] = this.pools.map(i => i.internalPool)): { route: IRoute<Pool>; amountOut: Amount } | null {
    const { denom: tokenInDenomOsmo, decimals: tokenInOsmoDecimals } = getTokenDenom(tokenInId);
    const { denom: tokenOutDenomOsmo, decimals: tokenOutOsmoDecimals } = getTokenDenom(tokenOutId);
    poolsHint.length > 10 && console.time('Osmo')
    const [osmo] = calculateBestOsmosisSwapRoute({
      tokenInAmount: bigInteger(amountIn.multipliedBy(10 ** tokenInOsmoDecimals).toFixed(0)),
      tokenOutDenom: tokenOutDenomOsmo,
      tokenInDenom: tokenInDenomOsmo,
    }, poolsHint);
    poolsHint.length > 10 && console.timeEnd('Osmo')

    return {
      amountOut: convertCoinFromUDenomV2(osmo.out.toString(), tokenOutOsmoDecimals),
      route: osmo.pools.map(pool => ({pool})),
    };
  }

  public override subscribeToPoolsUpdate(retryTime = 300): Observable<{ pools: IPool<Pool>[], height: number }> {
    return new Observable<{ pools: IPool<Pool>[], height: number }>(observer => {
      createCosmosObserver(this.rpcEndpoint, retryTime).subscribe(blockHeight => getOsmoPools()
        .then(osmoPools => {
          const latestOsmoPools = osmoPools.map(op => ({
            poolId: op.id as PoolId,
            dex: 'osmosis' as DexProtocolName,
            token0Id: toTokenId(op.poolAssets[0].denom as Denom, op.id, 0),
            token0Amount: bigInteger(op.poolAssets[0].amount.toString()),
            token1Id: toTokenId(op.poolAssets[1].denom as Denom, op.id, 1),
            token1Amount: bigInteger(op.poolAssets[1].amount.toString()),
            internalPool: op,
          }));
          this.pools = latestOsmoPools;
          return observer.next({
            pools: latestOsmoPools,
            height: blockHeight,
          });
        }).catch(observer.error.bind(observer)), observer.error.bind(observer));
    });
  }
}
