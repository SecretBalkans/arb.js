import {
  Amount,
  DexProtocol,
  DexProtocolName,
  IPool,
  IRoute,
  PoolId, PoolToken,
  SwapToken,
  SwapTokenMap,
  Token,
} from '../types/dex-types';
import { extractShadeTokenSymbolById, getShadeTokenBySymbol, toTokenId } from './tokens';
import {
  calculateStableSwapPriceImpactInputToken0,
  calculateStableSwapPriceImpactInputToken1,
  calculateXYKPriceImpactFromToken0Amount,
  calculateXYKPriceImpactFromToken1Amount,
  calculateXYKToken0AmountFromToken1Amount,
  calculateXYKToken1AmountFromToken0Amount,
  findShadePaths,
  Fo,
  getTradeInputOfSimulateReverseToken0WithToken1Trade,
  getTradeInputOfSimulateReverseToken1WithToken0Trade,
  Ro,
  ShadeSwapRoute,
  stableSwapToken0ToToken1InPool,
  stableSwapToken1ToToken0InPool, validateTradeSize,
} from './shade-calc';
import { convertCoinFromUDenomV2, convertCoinToUDenomV2, Logger } from '../../utils';
import { Observable } from 'rxjs';
import createCosmosObserver from '../utils/cosmosObserver';
import { getShadePairs, parsePoolsRaw, ShadePair, ShadeRoutePool, useTokens } from './shade-rest';
import _ from 'lodash';
import BigNumber from 'bignumber.js';
const logger = new Logger('ShadeSwap')
export default class ShadeSwap extends DexProtocol<ShadePair> {
  public name = 'shade' as DexProtocolName;
  public pools: IPool<ShadePair>[];
  routePairsById: { [p: string]: ShadeRoutePool; };

  constructor(public readonly rpcEndpoint: string) {
    super();
  }

  public override;

  calcSwapWithPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, poolsHint: ShadePair[]): { route: IRoute<ShadePair>; amountOut: Amount } | null {
    const startingToken = getShadeTokenBySymbol(tokenInId);
    const endingToken = getShadeTokenBySymbol(tokenOutId);
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
      pools: _.map(poolsHint, p => (p?.rawInfo?.id || p['poolId'] || p['id']) as PoolId),
    });
    return route ? {
      route: route.route.map(r => ({
        pool: {
          poolId: r.id,
          token1Id: extractShadeTokenSymbolById(r.token0Id) as PoolToken,
          token0Id: extractShadeTokenSymbolById(r.token1Id) as PoolToken,
          token0Amount: r.token0Amount,
          token1Amount: r.token1Amount,
          dex: 'shade',
          internalPool: null, // TODO: shade internal pool info
        },
      })),
      amountOut: convertCoinFromUDenomV2(route.quoteOutputAmount, endingToken.decimals),
    } : null;
  }


  calculateBestShadeSwapRoutes({
                                 inputTokenAmount: tokenAmount,
                                 startingTokenId: startingTokenId,
                                 endingTokenId: endingTokenId,
                                 maxHops: maxHops,
                                 isReverse: h = !1,
                                 pools,
                               }: {
    inputTokenAmount: Amount,
    startingTokenId: string,
    endingTokenId: string,
    maxHops: number,
    pools: PoolId[],
    isReverse: boolean,
  }): ShadeSwapRoute[] {
    const poolsMap: { [p: PoolId]: ShadeRoutePool } = pools.length ? _.pick(this.routePairsById, pools) : this.routePairsById;

    const rawPaths = findShadePaths({
      startingTokenId: startingTokenId,
      endingTokenId: endingTokenId,
      maxHops: maxHops,
      pools: poolsMap,
    });
    if (rawPaths.length === 0) {
      return [];
    }
    if (!h) {
      return rawPaths
        .reduce((agg, currentPath) => {
          try {
            const pathCalculation = this.calculatePathOutcome({
              startingTokenAmount: tokenAmount,
              startingTokenId: startingTokenId,
              path: currentPath,
            });
            return agg.push(pathCalculation),
              agg;
          } catch (err) {
            logger.debugOnce(`Path outcome error = ${err.message}`);
            return agg;
          }
        }, [])
        .sort((d, _) => d.quoteOutputAmount.isGreaterThan(_.quoteOutputAmount) ? -1 : d.quoteOutputAmount.isLessThan(_.quoteOutputAmount) ? 1 : 0);
    } else {
      const $ = rawPaths.reduce((d, _) => {
          try {
            const D = this.calculatePathQuotaByEnding({
              endingTokenAmount: tokenAmount,
              endingTokenId: endingTokenId,
              path: _,
            });
            return d.push(D),
              d;
          } catch (err) {
            console.error(err);
            debugger;
            return d;
          }
        }
        , []);
      if ($.length === 0) {
        return [];
      }
      const F = $.reduce((d, _) => d.inputAmount.isLessThan(_.inputAmount) ? d : _, $[0])
        , P = F.inputAmount;
      return rawPaths.map(path => this.calculatePathOutcome({
        startingTokenAmount: P,
        startingTokenId: startingTokenId,
        path: path,
      })).map(d => JSON.stringify(d.route) === JSON.stringify(F.route) ? F : d)
        .sort((d, _) => JSON.stringify(d.route) === JSON.stringify(F.route) ? -1 : JSON.stringify(_.route) === JSON.stringify(F.route) ? 1 : d.quoteOutputAmount.isGreaterThan(_.quoteOutputAmount) ? -1 : d.quoteOutputAmount.isLessThan(_.quoteOutputAmount) ? 1 : 0);
    }
  }
  calculatePathQuotaByEnding({
                                        endingTokenAmount: endingTokenAmount,
                                        endingTokenId: endingTokenId,
                                        path: path,
                                      }) {
    const { getTokenDecimals: getTokenDecimals } = useTokens()
      , {
      inputTokenId: sourceTokenId,
      quoteInputAmount: inputAmount,
      quoteShadeDaoFee: quoteShadeDaoFee,
      quoteLPFee: quoteLpFee,
      quotePriceImpact: priceImpact,
      hops: hopsButAlsoRouteUnclear,
    } = [...path].reverse().reduce((pathSegment, poolId) => {
      const {
        inputTokenId: inputTokenId,
        quoteInputAmount: quoteInputAmount,
        quoteShadeDaoFee: quoteShadeDaoFee,
        quotePriceImpact: quotePriceImpact,
        quoteLPFee: quoteLpFee,
        hops: numOfHops,
      } = pathSegment;
      let otherTokenAmount, priceImpact;
      const poolPairInfo = this.getPoolById(poolId);
      numOfHops.unshift(poolPairInfo);
      const token0Decimals = getTokenDecimals(poolPairInfo.token0Id)
        , token1Decimals = getTokenDecimals(poolPairInfo.token1Id)
        , token0AmountInDenom = poolPairInfo.token0Amount.multipliedBy(10 ** token0Decimals)
        , token1AmountInDenom = poolPairInfo.token1Amount.multipliedBy(10 ** token1Decimals)
        , inputTokenDecimals = getTokenDecimals(inputTokenId)
        , inputAmount = quoteInputAmount.toString()
        , l = convertCoinFromUDenomV2(inputAmount, inputTokenDecimals);
      let u;
      inputTokenId === poolPairInfo.token0Id ? u = poolPairInfo.token1Id : u = poolPairInfo.token0Id;
      const te = getTokenDecimals(u);
      if (this.isStablePool(poolId)) {
        if (inputTokenId === poolPairInfo.token1Id && poolPairInfo.stableParams !== null) {
          const Z = {
            outputToken1Amount: l,
            poolToken0Amount: poolPairInfo.token0Amount,
            poolToken1Amount: poolPairInfo.token1Amount,
            priceRatio: poolPairInfo.stableParams.priceRatio,
            a: poolPairInfo.stableParams.a,
            gamma1: poolPairInfo.stableParams.gamma1,
            gamma2: poolPairInfo.stableParams.gamma2,
            liquidityProviderFee: poolPairInfo.fees.liquidityProvider,
            daoFee: poolPairInfo.fees.dao,
            minTradeSizeToken0For1: poolPairInfo.stableParams.minTradeSizeToken0For1,
            minTradeSizeToken1For0: poolPairInfo.stableParams.minTradeSizeToken1For0,
            priceImpactLimit: poolPairInfo.stableParams.maxPriceImpactAllowed,
          }
            , startingInputTokenAmount = getTradeInputOfSimulateReverseToken0WithToken1Trade(Z);
          otherTokenAmount = BigNumber(convertCoinToUDenomV2(startingInputTokenAmount, te).toString());
          const b = {
            inputToken0Amount: startingInputTokenAmount,
            poolToken0Amount: poolPairInfo.token0Amount,
            poolToken1Amount: poolPairInfo.token1Amount,
            priceRatio: poolPairInfo.stableParams.priceRatio,
            a: poolPairInfo.stableParams.a,
            gamma1: poolPairInfo.stableParams.gamma1,
            gamma2: poolPairInfo.stableParams.gamma2,
            liquidityProviderFee: poolPairInfo.fees.liquidityProvider,
            daoFee: poolPairInfo.fees.dao,
            minTradeSizeToken0For1: poolPairInfo.stableParams.minTradeSizeToken0For1,
            minTradeSizeToken1For0: poolPairInfo.stableParams.minTradeSizeToken1For0,
            priceImpactLimit: poolPairInfo.stableParams.maxPriceImpactAllowed,
          };
          priceImpact = calculateStableSwapPriceImpactInputToken0(b);
        } else if (inputTokenId === poolPairInfo.token0Id && poolPairInfo.stableParams !== null) {
          const Z = {
            outputToken0Amount: l,
            poolToken0Amount: poolPairInfo.token0Amount,
            poolToken1Amount: poolPairInfo.token1Amount,
            priceRatio: poolPairInfo.stableParams.priceRatio,
            a: poolPairInfo.stableParams.a,
            gamma1: poolPairInfo.stableParams.gamma1,
            gamma2: poolPairInfo.stableParams.gamma2,
            liquidityProviderFee: poolPairInfo.fees.liquidityProvider,
            daoFee: poolPairInfo.fees.dao,
            minTradeSizeToken0For1: poolPairInfo.stableParams.minTradeSizeToken0For1,
            minTradeSizeToken1For0: poolPairInfo.stableParams.minTradeSizeToken1For0,
            priceImpactLimit: poolPairInfo.stableParams.maxPriceImpactAllowed,
          }
            , V = getTradeInputOfSimulateReverseToken1WithToken0Trade(Z);
          otherTokenAmount = BigNumber(convertCoinToUDenomV2(V, te).toString());
          const b = {
            inputToken1Amount: V,
            poolToken0Amount: poolPairInfo.token0Amount,
            poolToken1Amount: poolPairInfo.token1Amount,
            priceRatio: poolPairInfo.stableParams.priceRatio,
            a: poolPairInfo.stableParams.a,
            gamma1: poolPairInfo.stableParams.gamma1,
            gamma2: poolPairInfo.stableParams.gamma2,
            liquidityProviderFee: poolPairInfo.fees.liquidityProvider,
            daoFee: poolPairInfo.fees.dao,
            minTradeSizeToken0For1: poolPairInfo.stableParams.minTradeSizeToken0For1,
            minTradeSizeToken1For0: poolPairInfo.stableParams.minTradeSizeToken1For0,
            priceImpactLimit: poolPairInfo.stableParams.maxPriceImpactAllowed,
          };
          priceImpact = calculateStableSwapPriceImpactInputToken1(b);
        } else {
          throw Error('stableswap parameter error');
        }
      } // An XYK Pool
      else if (inputTokenId === poolPairInfo.token1Id) {
        otherTokenAmount = calculateXYKToken0AmountFromToken1Amount({
          token0LiquidityAmount: token0AmountInDenom,
          token1LiquidityAmount: token1AmountInDenom,
          token1OutputAmount: quoteInputAmount,
          fee: poolPairInfo.fees.liquidityProvider.plus(poolPairInfo.fees.dao),
        }),
          priceImpact = calculateXYKPriceImpactFromToken0Amount({
            token0LiquidityAmount: token0AmountInDenom,
            token1LiquidityAmount: token1AmountInDenom,
            token0InputAmount: otherTokenAmount,
          });
      } else if (inputTokenId === poolPairInfo.token0Id)
        otherTokenAmount = calculateXYKToken1AmountFromToken0Amount({
          token0LiquidityAmount: token0AmountInDenom,
          token1LiquidityAmount: token1AmountInDenom,
          token0OutputAmount: quoteInputAmount,
          fee: poolPairInfo.fees.liquidityProvider.plus(poolPairInfo.fees.dao),
        }),
          priceImpact = calculateXYKPriceImpactFromToken1Amount({
            token0LiquidityAmount: token0AmountInDenom,
            token1LiquidityAmount: token1AmountInDenom,
            token1InputAmount: otherTokenAmount,
          });
      else
        throw Error('constant product rule swap parameter error');
      return {
        inputTokenId: u,
        quoteInputAmount: otherTokenAmount,
        quoteShadeDaoFee: quoteShadeDaoFee.plus(poolPairInfo.fees.dao),
        quoteLPFee: quoteLpFee.plus(poolPairInfo.fees.liquidityProvider),
        quotePriceImpact: quotePriceImpact.plus(priceImpact),
        hops: numOfHops,
      };
    }, {
      inputTokenId: endingTokenId,
      quoteInputAmount: endingTokenAmount,
      quoteShadeDaoFee: BigNumber(0),
      quoteLPFee: BigNumber(0),
      quotePriceImpact: BigNumber(0),
      hops: [],
    });
    return {
      inputAmount: inputAmount,
      quoteOutputAmount: endingTokenAmount,
      quoteShadeDaoFee: quoteShadeDaoFee,
      quoteLPFee: quoteLpFee,
      priceImpact: priceImpact,
      sourceTokenId: sourceTokenId,
      targetTokenId: endingTokenId,
      route: hopsButAlsoRouteUnclear,
    };
  }

  public override subscribeToPoolsUpdate(retryTime = 300): Observable<{ pools: IPool<ShadePair>[]; height: number }> {
    return new Observable<{ pools: IPool<ShadePair>[], height: number }>(observer => {
      createCosmosObserver(this.rpcEndpoint, retryTime).subscribe(blockHeight => {
        const b = performance.now()
        getShadePairs()
          .then((shadePairs: ShadePair[]) => {
            const latestPools = shadePairs.map(sp => ({
              poolId: sp.name as PoolId,
              dex: 'shade' as DexProtocolName,
              token0Id: toTokenId(sp.token0),
              token0Amount: BigNumber(sp.token0.amount),
              token1Id: toTokenId(sp.token1),
              token1Amount: BigNumber(sp.token1.amount),
              internalPool: sp,
            }));
            this.pools = latestPools;
            this.routePairsById = parsePoolsRaw(_.map(shadePairs, 'rawInfo'));
            console.log(performance.now() - b);
            return observer.next({
              pools: latestPools,
              height: blockHeight,
            });
          }).catch(console.error);
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
        pools: this.routePairsById,
      }));
    }));
  }

  private calculatePathOutcome({
                                 startingTokenAmount: startingTokenAmount,
                                 startingTokenId: startingTokenId,
                                 path: path,
                               }) {
    const g = useTokens()
      , { getTokenDecimals: getTokenDecimals } = g
      , pathReduceResult = path.reduce((pathSegment, poolId) => {
        const {
          outputTokenId: outputTokenId,
          quoteOutputAmount: quoteOutputAmount,
          quoteShadeDaoFee: re,
          quotePriceImpact: totalPriceImpact,
          quoteLPFee: totalLPFee,
          hops: ne,
        } = pathSegment;
        let otherTokenDenomAmount, priceImpact;
        const poolPairInfo = this.getPoolById(poolId);
        // , he = parseRawPool(poolPairInfo);
        ne.push(poolPairInfo);
        const token0Decimals = getTokenDecimals(poolPairInfo.token0Id)
          , token1Decimals = getTokenDecimals(poolPairInfo.token1Id)
          , token0AmountInDenom = poolPairInfo.token0Amount.multipliedBy(10 ** token0Decimals)
          , token1AmountInDenom = poolPairInfo.token1Amount.multipliedBy(10 ** token1Decimals)
          , outputTokenDecimals = getTokenDecimals(outputTokenId)
          , outputAmountString = quoteOutputAmount.toString()
          , inputToken0Amount = convertCoinFromUDenomV2(outputAmountString, outputTokenDecimals);
        let otherTokenId;
        outputTokenId === poolPairInfo.token0Id ? otherTokenId = poolPairInfo.token1Id : otherTokenId = poolPairInfo.token0Id;
        const otherTokenDecimals = getTokenDecimals(otherTokenId);
        if (this.isStablePool(poolId))
          if (outputTokenId === poolPairInfo.token0Id && poolPairInfo.stableParams !== null) {
            const stablePoolParams = {
              inputToken0Amount: inputToken0Amount,
              poolToken0Amount: poolPairInfo.token0Amount,
              poolToken1Amount: poolPairInfo.token1Amount,
              priceRatio: poolPairInfo.stableParams.priceRatio,
              a: poolPairInfo.stableParams.a,
              gamma1: poolPairInfo.stableParams.gamma1,
              gamma2: poolPairInfo.stableParams.gamma2,
              liquidityProviderFee: poolPairInfo.fees.liquidityProvider,
              daoFee: poolPairInfo.fees.dao,
              minTradeSizeToken0For1: poolPairInfo.stableParams.minTradeSizeToken0For1,
              minTradeSizeToken1For0: poolPairInfo.stableParams.minTradeSizeToken1For0,
              priceImpactLimit: poolPairInfo.stableParams.maxPriceImpactAllowed,
            }
              , otherTokenAmount = stableSwapToken0ToToken1InPool(stablePoolParams);
            otherTokenDenomAmount = BigNumber(convertCoinToUDenomV2(otherTokenAmount, otherTokenDecimals).toString()),
              priceImpact = calculateStableSwapPriceImpactInputToken0(stablePoolParams);
          } else if (outputTokenId === poolPairInfo.token1Id && poolPairInfo.stableParams !== null) {
            const Z = {
              inputToken1Amount: inputToken0Amount,
              poolToken0Amount: poolPairInfo.token0Amount,
              poolToken1Amount: poolPairInfo.token1Amount,
              priceRatio: poolPairInfo.stableParams.priceRatio,
              a: poolPairInfo.stableParams.a,
              gamma1: poolPairInfo.stableParams.gamma1,
              gamma2: poolPairInfo.stableParams.gamma2,
              liquidityProviderFee: poolPairInfo.fees.liquidityProvider,
              daoFee: poolPairInfo.fees.dao,
              minTradeSizeToken0For1: poolPairInfo.stableParams.minTradeSizeToken0For1,
              minTradeSizeToken1For0: poolPairInfo.stableParams.minTradeSizeToken1For0,
              priceImpactLimit: poolPairInfo.stableParams.maxPriceImpactAllowed,
            }
              , V = stableSwapToken1ToToken0InPool(Z);
            otherTokenDenomAmount = BigNumber(convertCoinToUDenomV2(V, otherTokenDecimals).toString()),
              priceImpact = calculateStableSwapPriceImpactInputToken1(Z);
          } else {
            throw Error('stableswap parameter error');
          } else if (outputTokenId === poolPairInfo.token0Id) {
          otherTokenDenomAmount = Fo({
            token0LiquidityAmount: token0AmountInDenom,
            token1LiquidityAmount: token1AmountInDenom,
            token0InputAmount: quoteOutputAmount,
            fee: poolPairInfo.fees.liquidityProvider.plus(poolPairInfo.fees.dao),
          });
          priceImpact = calculateXYKPriceImpactFromToken0Amount({
            token0LiquidityAmount: token0AmountInDenom,
            token1LiquidityAmount: token1AmountInDenom,
            token0InputAmount: quoteOutputAmount,
          });
        } else if (outputTokenId === poolPairInfo.token1Id)
          otherTokenDenomAmount = Ro({
            token0LiquidityAmount: token0AmountInDenom,
            token1LiquidityAmount: token1AmountInDenom,
            token1InputAmount: quoteOutputAmount,
            fee: poolPairInfo.fees.liquidityProvider.plus(poolPairInfo.fees.dao),
          }),
            priceImpact = calculateXYKPriceImpactFromToken1Amount({
              token0LiquidityAmount: token0AmountInDenom,
              token1LiquidityAmount: token1AmountInDenom,
              token1InputAmount: quoteOutputAmount,
            });
        else
          throw Error('constant product rule swap parameter error');
        try {
          validateTradeSize(otherTokenDenomAmount, BigNumber(0))
        } catch (e) {
          const shadePairIPool = _.find(this.pools, p => p.internalPool.rawInfo.id === poolId);
          throw Error(`Invalid trade size ${e.message} at path = ${shadePairIPool?.poolId}`);
        }
        return {
          outputTokenId: otherTokenId,
          quoteOutputAmount: otherTokenDenomAmount,
          quoteShadeDaoFee: re.plus(poolPairInfo.fees.dao),
          quoteLPFee: totalLPFee.plus(poolPairInfo.fees.liquidityProvider),
          quotePriceImpact: totalPriceImpact.plus(priceImpact),
          hops: ne,
        };
      }
      , {
        outputTokenId: startingTokenId,
        quoteOutputAmount: startingTokenAmount,
        quoteShadeDaoFee: BigNumber(0),
        quoteLPFee: BigNumber(0),
        quotePriceImpact: BigNumber(0),
        hops: [],
      })
      , {
      outputTokenId: $,
      quoteOutputAmount: F,
      quoteShadeDaoFee: P,
      quoteLPFee: I,
      quotePriceImpact: d,
      hops: rt,
    } = pathReduceResult;
    return {
      inputAmount: startingTokenAmount,
      quoteOutputAmount: F,
      quoteShadeDaoFee: P,
      quoteLPFee: I,
      priceImpact: d,
      sourceTokenId: startingTokenId,
      targetTokenId: $,
      route: rt,
    };
  }

  private getPoolById(poolId: PoolId): ShadeRoutePool {
    return this.routePairsById[poolId];
  }

  private isStablePool(poolId: PoolId) {
    return this.getPoolById(poolId).stableParams !== null;
  }
}
