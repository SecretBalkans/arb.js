import {
  Amount,
  Denom,
  DexProtocol,
  DexProtocolName,
  IPool,
  IRoute,
  PoolId,
  SwapToken,
  SwapTokenMap,
  Token,
} from '../types/dex-types';
import { getTokenDenom, toTokenId } from './tokens';
import { calculateBestOsmosisSwapRoute } from './osmosis-calc';
import { getOsmoPairPools, getOsmoPools } from './osmosis-rest';
import { convertCoinFromUDenomV2, Logger } from '../../utils';
import { Observable } from 'rxjs';
import createCosmosObserver from '../utils/cosmosObserver';
import { Pool } from '../../lib/@osmosis/packages/pools/src';
import bigInteger from 'big-integer';
import _ from 'lodash';
import BigNumber from 'bignumber.js';

const logger = new Logger('OsmosisSwap');
export default class OsmosisSwap extends DexProtocol<Pool> {
  public name = 'osmosis' as DexProtocolName;
  public pools: IPool<Pool>[];

  constructor(public readonly rpcEndpoint: string) {
    super();
  }

  public override calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, poolsHint: Pool[]): { route: IRoute<Pool>; amountOut: Amount } | null {
    const { denom: tokenInDenomOsmo, decimals: tokenInOsmoDecimals } = getTokenDenom(tokenInId);
    const { denom: tokenOutDenomOsmo, decimals: tokenOutOsmoDecimals } = getTokenDenom(tokenOutId);

    const tokenInAmount = bigInteger(amountIn.multipliedBy(10 ** tokenInOsmoDecimals).toFixed(0));
    const [osmo] = calculateBestOsmosisSwapRoute({
      tokenInAmount,
      tokenOutDenom: tokenOutDenomOsmo,
      tokenInDenom: tokenInDenomOsmo,
    });

    const amountOut = convertCoinFromUDenomV2(osmo?.out?.toString(), tokenOutOsmoDecimals);
    return {
      amountOut,
      route: osmo?.pools?.map(pool => ({
        pool: {
          poolId: pool.id as PoolId,
          token0Amount: BigNumber(pool.poolAssets[0].amount.toString()),
          token1Amount: BigNumber(pool.poolAssets[1].amount.toString()), // TODO: calculate token amounts in internal routes maybe ?
          internalPool: pool.id as unknown as any, // TODO: fix this
          dex: 'osmosis',
          token0Id: toTokenId(tokenInDenomOsmo),
          token1Id: toTokenId(tokenOutDenomOsmo),
        },
      })),
    };
  }

  public override subscribeToPoolsUpdate(retryTime = 500): Observable<{ pools: IPool<Pool>[], height: number }> {
    return new Observable<{ pools: IPool<Pool>[], height: number }>(observer => {
      createCosmosObserver(this.rpcEndpoint, retryTime).subscribe(blockHeight => getOsmoPools()
        .then(osmoPools => {
          const latestOsmoPools = osmoPools.map(op => ({
            poolId: op.id as PoolId,
            dex: 'osmosis' as DexProtocolName,
            token0Id: toTokenId(op.poolAssets[0].denom as Denom, op.id, 0),
            token0Amount: BigNumber(op.poolAssets[0].amount.toString()),
            token1Id: toTokenId(op.poolAssets[1].denom as Denom, op.id, 1),
            token1Amount: BigNumber(op.poolAssets[1].amount.toString()),
            internalPool: op,
          }));
          this.pools = latestOsmoPools;
          setImmediate(() => {
            observer.next({
              pools: latestOsmoPools,
              height: blockHeight,
            });
          })
        }).catch(observer.error.bind(observer)), observer.error.bind(observer));
    });
  }

  getPoolsMap(pairs: [SwapToken, SwapToken][]): PoolId[] {
    const arrays = _.flatMap(pairs, ([token1, token2]) => {
      try {
        const { denom: tokenInDenomOsmo } = getTokenDenom(SwapTokenMap[token1]);
        const { denom: tokenOutDenomOsmo } = getTokenDenom(SwapTokenMap[token2]);
        return getOsmoPairPools(tokenInDenomOsmo, tokenOutDenomOsmo);
      } catch (err) {
        logger.debugOnce(err.message);
        return [];
      }
    });
    return _.union(arrays);
  }
}
