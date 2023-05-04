import { Observable } from 'rxjs';
import {
  Amount,
  IPool,
  IRoute,
  Denom,
  PoolId,
  DexProtocolName,
  DexProtocol, Token,
} from '../types/swap-types';
import { allPools, getOsmoPools } from './osmosis-rest';
import BigNumber from 'bignumber.js';
import createCosmosObserver from '../utils/cosmosObserver';
import { convertCoinFromUDenomV2 } from '../../utils';
import { calculateBestOsmosisSwapRoute } from './osmosis-calc';
import { getTokenDenom, toTokenId } from './tokens';

export * from './osmosis-calc';
export * from './osmosis-rest';
export default class OsmosisSwap extends DexProtocol {
  public name = 'osmosis' as DexProtocolName
  public pools: IPool[];
  constructor(public readonly rpcEndpoint: string) {
    super();
  }

  public override calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, pools: IPool[]): { route: IRoute; amountOut: Amount } {
    const { denom: tokenInDenomOsmo, decimals: tokenInOsmoDecimals} = getTokenDenom(tokenInId);
    const { denom: tokenOutDenomOsmo, decimals: tokenOutOsmoDecimals} = getTokenDenom(tokenOutId);

    const [osmo] = calculateBestOsmosisSwapRoute({
      tokenInAmount: amountIn.multipliedBy(10 ** tokenInOsmoDecimals),
      tokenOutDenom: tokenOutDenomOsmo,
      tokenInDenom: tokenInDenomOsmo,
    }, allPools);
    // TODO: ensure that subscribeToPoolUpdate keeps StablePool/WeightedPool classes to be carried through the IPool class as some kind of internal reference

    return {
      amountOut: convertCoinFromUDenomV2(osmo.out.toString(), tokenOutOsmoDecimals),
      route: osmo.pools.map(p => ({
        poolId: p.id,
      })),
    };
  }

  public override subscribeToPoolsUpdate(retryTime = 300): Observable<{ pools: IPool[], height: number }> {
    return new Observable<{ pools: IPool[], height: number }>(observer => {
      createCosmosObserver(this.rpcEndpoint, retryTime).subscribe(blockHeight => getOsmoPools()
        .then(osmoPools => {
          const latestOsmoPools = osmoPools.filter(d => d.poolAssets.length === 2).map(op => ({
            poolId: op.id as PoolId,
            dex: 'osmosis' as DexProtocolName,
            token0Id: toTokenId(op.poolAssets[0].denom as Denom, op.id, 0),
            token0Amount: BigNumber(op.poolAssets[0].amount.toString()),
            token1Id: toTokenId(op.poolAssets[1].denom as Denom, op.id, 1),
            token1Amount: BigNumber(op.poolAssets[1].amount.toString()),
          }));
          this.pools = latestOsmoPools;
          return observer.next({
            pools: latestOsmoPools,
            height: blockHeight,
          });
        }).catch(observer.error), observer.error);
    });
  }
}
