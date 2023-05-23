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
import {getTokenDenom, toTokenId} from './tokens';

import {getOsmoPools} from './osmosis-rest';
import {convertCoinFromUDenomV2, Logger} from '../../utils';
import {Observable} from 'rxjs';
import createCosmosObserver from '../utils/cosmosObserver';
import {OptimizedRoutes, Pool} from '../../lib/@osmosis/packages/pools/src';
import bigInteger from 'big-integer';
import _ from 'lodash';
import BigNumber from 'bignumber.js';
import incentivizedPoolIds from "./incentivizedPoolIds";
import OsmosisCalc from "./osmosis-calc";

const pairPools: Record<string, PoolId[]> = {};

const logger = new Logger('OsmosisSwap');
export default class OsmosisSwap extends DexProtocol<'osmosis'> {
  public name = 'osmosis' as DexProtocolName;
  public pools: IPool<Pool>[];
  calc: OsmosisCalc;
  private rawPools: Pool[];
  blockRouter: OptimizedRoutes = null;

  constructor(public readonly rpcEndpoint: string) {
    super();
  }

  public override calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, poolsHint: IRoute<'osmosis'>): { route: IRoute<'osmosis'>; amountOut: Amount } | null {
    const {denom: tokenInDenomOsmo, decimals: tokenInOsmoDecimals} = getTokenDenom(tokenInId);
    const {denom: tokenOutDenomOsmo, decimals: tokenOutOsmoDecimals} = getTokenDenom(tokenOutId);

    const tokenInAmount = bigInteger(amountIn.multipliedBy(10 ** tokenInOsmoDecimals).toFixed(0));
    let poolsToCalc: Pool[];
    if (poolsHint?.length) {
      poolsToCalc = poolsHint.map(hint => hint.raw);
    } else {
      const osmoPairPools = this.getOsmoPairPools(tokenInDenomOsmo, tokenOutDenomOsmo);
      poolsToCalc = this.rawPools.filter(p => osmoPairPools.includes(p.id as PoolId))
    }
    const calc = new OsmosisCalc(poolsToCalc)
    const [osmo] = calc.calculateBestOsmosisSwapRoute({
      tokenInAmount,
      tokenOutDenom: tokenOutDenomOsmo,
      tokenInDenom: tokenInDenomOsmo
    });

    const amountOut = convertCoinFromUDenomV2(osmo?.out?.toString(), tokenOutOsmoDecimals);
    return {
      amountOut,
      route: osmo?.pools?.map(pool => ({
        raw: pool,
        t0: {
          decimals: tokenInOsmoDecimals,
          denom: tokenInDenomOsmo,
          symbol: tokenInId
        },
        t1: {
          decimals: tokenOutOsmoDecimals,
          denom: tokenOutDenomOsmo,
          symbol: tokenOutId
        }
      }))
    };
  }

  public override subscribeToPoolsUpdate(retryTime = 500): Observable<{ pools: IPool<Pool>[], height: number }> {
    return new Observable<{ pools: IPool<Pool>[], height: number }>(observer => {
      createCosmosObserver(this.rpcEndpoint, retryTime).subscribe(blockHeight => getOsmoPools()
        .then(osmoPools => {
          this.blockRouter = null;
          const latestOsmoPools = osmoPools.map(op => ({
            poolId: op.id as PoolId,
            dex: 'osmosis' as DexProtocolName,
            token0Id: toTokenId(op.poolAssets[0].denom as Denom, op.id, 0),
            token0Amount: BigNumber(op.poolAssets[0].amount.toString()),
            token1Id: toTokenId(op.poolAssets[1].denom as Denom, op.id, 1),
            token1Amount: BigNumber(op.poolAssets[1].amount.toString()),
            internalPool: op,
          }));
          this.rawPools = osmoPools;
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


  private getOsmoPairPools(tokenInDenom: string, tokenOutDenom: string): PoolId[] {
    const pairKey = OsmosisCalc.getPairKey(tokenInDenom, tokenOutDenom);
    if (!pairPools[pairKey]) {
      this.blockRouter = this.blockRouter || new OptimizedRoutes(this.rawPools, incentivizedPoolIds, 'uosmo');
      pairPools[pairKey] = [...this.blockRouter.getCandidateRoutes(tokenInDenom, tokenOutDenom, 4, 3),
        ...this.blockRouter.getCandidateRoutes(tokenOutDenom, tokenInDenom, 4, 3)]
        .flatMap(d => d.pools.map(pool => pool.id as PoolId));
    }
    return pairPools[pairKey];
  }

  getPoolsMap(pairs: [SwapToken, SwapToken][]): PoolId[] {
    const arrays = _.flatMap(pairs, ([token1, token2]) => {
      try {
        const {denom: tokenInDenomOsmo} = getTokenDenom(SwapTokenMap[token1]);
        const {denom: tokenOutDenomOsmo} = getTokenDenom(SwapTokenMap[token2]);
        return this.getOsmoPairPools(tokenInDenomOsmo, tokenOutDenomOsmo);
      } catch (err) {
        logger.debugOnce(err.message);
        return [];
      }
    });
    return _.union(arrays);
  }
}

