/* tslint:disable */
import {
  Amount,
  DexProtocol,
  DexProtocolName,
  IPool,
  Route,
  PoolId,
  SwapToken,
  SwapTokenMap,
  Token,
} from '../types/dex-types';
import {extractShadeTokenSymbol, getShadeTokenById, getShadeTokenBySymbol, toTokenId} from './tokens';
import {
  findShadePaths,
  ShadeSwapRoute,
} from './shade-calc-utils';
import {convertCoinFromUDenomV2, Logger} from '../../utils';
import {Observable} from 'rxjs';
import createCosmosObserver from '../utils/cosmosObserver';
import {getShadePairs, parsePoolsRaw} from './shade-api';
import _ from 'lodash';
import BigNumber from 'bignumber.js';
import ShadeCalc, {ShadeRoutePoolEssentialsIdMap} from "./shade-calc";
import {ShadePair} from './shade-api-utils';

const logger = new Logger('ShadeSwap')
export default class ShadeSwap extends DexProtocol<'shade'> {
  public name = 'shade' as DexProtocolName;
  public pools: IPool<ShadePair>[];
  shadePairsMap: ShadeRoutePoolEssentialsIdMap;

  constructor(public readonly rpcEndpoint: string, private readonly USE_ONLY_SHADE_API_NO_BLOCKCHAIN_QUERY = false) {
    super();
  }

  public override calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, poolsHint: Route<'shade'>): { route: Route<'shade'>; amountOut: Amount } | null {
    const startingToken = getShadeTokenBySymbol(tokenInId);
    const endingToken = getShadeTokenBySymbol(tokenOutId);
    const pools = _.map(poolsHint, p => p.raw.id);
    const [route] = this.calculateBestShadeSwapRoutes({
      inputTokenAmount: amountIn.multipliedBy(10 ** startingToken.decimals),
      startingTokenId: startingToken.id,
      endingTokenId: endingToken.id,
      isReverse: false,
      maxHops: 5,
      // TODO: there is a limit on secret network for max hops length.
      //  we need to split big routes into two smaller ones and execute it into
      //  two messages and thus support bigger (7-8-more?) routes
      //  as they can often give better arb
      shadePairs: pools?.length ? _.pick(this.shadePairsMap, pools) : this.shadePairsMap,
    });
    return route ? {
      route: route.route.map(r => {
        let token0 = getShadeTokenById(r.token0Id);
        let token1 = getShadeTokenById(r.token1Id);
        return ({
          raw: r,
          t0: {
            symbol: extractShadeTokenSymbol(token0),
            ..._.pick(token0, ['id', 'contract_address', 'code_hash', 'logo_path', 'decimals'])
          },
          t1: {
            symbol: extractShadeTokenSymbol(token1),
            ..._.pick(token1, ['id', 'contract_address', 'code_hash', 'logo_path', 'decimals'])
          },
        });
      }),
      amountOut: convertCoinFromUDenomV2(route.quoteOutputAmount, endingToken.decimals),
    } : null;
  }


  calculateBestShadeSwapRoutes({
                                 inputTokenAmount: tokenAmount,
                                 startingTokenId: startingTokenId,
                                 endingTokenId: endingTokenId,
                                 maxHops: maxHops,
                                 isReverse: h = !1,
                                 shadePairs,
                               }: {
    inputTokenAmount: Amount,
    startingTokenId: string,
    endingTokenId: string,
    maxHops: number,
    shadePairs: ShadeRoutePoolEssentialsIdMap,
    isReverse: boolean,
  }): ShadeSwapRoute[] {
    const shadeCalc = new ShadeCalc(shadePairs)
    const rawPaths = findShadePaths({
      startingTokenId,
      endingTokenId,
      maxHops,
      pools: shadePairs,
    });
    if (rawPaths.length === 0) {
      return [];
    }
    if (!h) {
      return rawPaths
        .reduce((agg, currentPath) => {
          try {
            const pathCalculation = shadeCalc.calculatePathOutcome({
              startingTokenAmount: tokenAmount,
              startingTokenId,
              path: currentPath,
            });
            return agg.push(pathCalculation),
              agg;
          } catch (err) {
            logger.debugOnce(err.message, `Path outcome error (${currentPath})=${err.stack}`);
            return agg;
          }
        }, [])
        .sort((d, o) => d.quoteOutputAmount.isGreaterThan(o.quoteOutputAmount) ? -1 : d.quoteOutputAmount.isLessThan(o.quoteOutputAmount) ? 1 : 0);
    } else {
      const $ = rawPaths.reduce((d, path) => {
          try {
            const D = shadeCalc.calculatePathQuotaByEnding({
              endingTokenAmount: tokenAmount,
              endingTokenId,
              path,
            });
            return d.push(D),
              d;
          } catch (err) {
            logger.debugOnce(err.message);
            return d;
          }
        }
        , []);
      if ($.length === 0) {
        return [];
      }
      const F = $.reduce((d, o) => d.inputAmount.isLessThan(o.inputAmount) ? d : o, $[0])
        , P = F.inputAmount;
      return rawPaths.map(path => shadeCalc.calculatePathOutcome({
        startingTokenAmount: P,
        startingTokenId,
        path,
      })).map(d => JSON.stringify(d.route) === JSON.stringify(F.route) ? F : d)
        .sort((d, o) => JSON.stringify(d.route) === JSON.stringify(F.route) ? -1 : JSON.stringify(o.route) === JSON.stringify(F.route) ? 1 : d.quoteOutputAmount.isGreaterThan(o.quoteOutputAmount) ? -1 : d.quoteOutputAmount.isLessThan(o.quoteOutputAmount) ? 1 : 0);
    }
  }

  private isFetchingShadePairs = false;

  public override subscribeToPoolsUpdate(retryTime = 1000): Observable<{ pools: IPool<ShadePair>[]; height: number }> {
    return new Observable<{ pools: IPool<ShadePair>[], height: number }>(observer => {
      createCosmosObserver(this.rpcEndpoint, retryTime).subscribe(blockHeight => {
        if (!this.isFetchingShadePairs) {
          const b = performance.now()
          this.isFetchingShadePairs = true;
          getShadePairs(this.USE_ONLY_SHADE_API_NO_BLOCKCHAIN_QUERY)
            .then((shadePairs: ShadePair[]) => {
              const latestPools = _.compact(shadePairs).map(sp => ({
                poolId: sp.name as PoolId,
                dex: 'shade' as DexProtocolName,
                token0Id: toTokenId(sp.token0),
                token0Amount: BigNumber(sp.token0.amount),
                token1Id: toTokenId(sp.token1),
                token1Amount: BigNumber(sp.token1.amount),
                internalPool: sp,
              }));
              this.pools = latestPools;
              // We might need more properties from Parsed but here we cast to Essential
              this.shadePairsMap = parsePoolsRaw(_.map(shadePairs, 'rawInfo')) as ShadeRoutePoolEssentialsIdMap;
              console.log('ShadePairs', performance.now() - b);
              setImmediate(() => {
                observer.next({
                  pools: latestPools,
                  height: blockHeight,
                });
              })
            }).catch(console.error).then(() => {
            this.isFetchingShadePairs = false;
          });
        }
      }, console.error);
    });
  }

  getPoolsMap(pairs: [SwapToken, SwapToken][]): PoolId[] {
    return _.union(_.flatMap(pairs, ([token1, token2]) => {
      const startingToken = getShadeTokenBySymbol(SwapTokenMap[token1]);
      const endingToken = getShadeTokenBySymbol(SwapTokenMap[token2]);
      return _.flatten(findShadePaths({
        startingTokenId: startingToken.id,
        endingTokenId: endingToken.id,
        maxHops: 5,
        pools: this.shadePairsMap,
      }));
    }));
  }
}
