import { Observable } from 'rxjs';
import { ICanSwap, Amount, IPool, IRoute, ILivePoolStore, Denom, PoolId, DexProtocol } from '../types/swap-types';
import { getOsmoPools } from './osmosis-rest';
import BigNumber from 'bignumber.js';
import createCosmosObserver from '../utils/cosmosObserver';
import { convertCoinFromUDenomV2, makeIBCMinimalDenom } from '../../utils';
import { calculateBestOsmosisSwapRoute } from './osmosis-calc';
import { toTokenId } from './tokens';

export * from './osmosis-calc';
export * from './osmosis-rest';
export default class OsmosisSwap implements ICanSwap, ILivePoolStore {
  public name = 'osmosis' as DexProtocol
  constructor(public readonly rpcEndpoint: string) {

  }

  calculateSwapRoutesWithManyPools(amountIn: Amount, tokenInId: string, tokenOutId: string, pools: IPool[]): { route: IRoute; amountOut: Amount } {
    const tokenInDenomOsmo = makeIBCMinimalDenom('channel-208', 'uusdc');
    const tokenOutDenomOsmo = makeIBCMinimalDenom('channel-88', 'uscrt');
    const tokenOutOsmoDecimals = 6;
    const tokenInOsmoDecimals = 6;
    const [osmo] = calculateBestOsmosisSwapRoute({
      tokenInAmount: amountIn.multipliedBy(10 ** tokenInOsmoDecimals),
      tokenOutDenom: tokenOutDenomOsmo,
      tokenInDenom: tokenInDenomOsmo,
    });

    return {
      amountOut: convertCoinFromUDenomV2(osmo.out.toString(), tokenOutOsmoDecimals),
      route: osmo.pools.map(p => ({
        poolId: p.id,
      })),
    };
  }

  subscribeToPoolsUpdate(retryTime = 300): Observable<{ pools: IPool[], height: number }> {
    return new Observable<{ pools: IPool[], height: number }>(observer => {
      createCosmosObserver(this.rpcEndpoint, retryTime).subscribe(blockHeight => getOsmoPools()
        .then(osmoPools => observer.next({
          pools: osmoPools.filter(d => d.poolAssets.length === 2).map(op => ({
            poolId: op.id as PoolId,
            dex: 'osmosis',
            token0Id: toTokenId(op.poolAssets[0].denom as Denom, op.id, 0),
            token0Amount: BigNumber(op.poolAssets[0].amount.toString()),
            token1Id: toTokenId(op.poolAssets[1].denom as Denom, op.id, 1),
            token1Amount: BigNumber(op.poolAssets[1].amount.toString()),
          })),
          height: blockHeight,
        })).catch(observer.error), observer.error);
    });
  }
}
