/* tslint:disable:one-variable-per-declaration no-shadowed-variable */
import {useTokens} from "./shade-api-utils";
import {convertCoinFromUDenomV2, convertCoinToUDenomV2} from "../../utils";
import {
  calculateStableSwapPriceImpactInputToken0,
  calculateStableSwapPriceImpactInputToken1,
  calculateXYKPriceImpactFromToken0Amount,
  calculateXYKPriceImpactFromToken1Amount,
  calculateXYKToken0AmountFromToken1Amount,
  calculateXYKToken1AmountFromToken0Amount,
  Fo,
  getTradeInputOfSimulateReverseToken0WithToken1Trade,
  getTradeInputOfSimulateReverseToken1WithToken0Trade,
  Ro,
  stableSwapToken0ToToken1InPool,
  stableSwapToken1ToToken0InPool, validateTradeSize
} from "./shade-calc-utils";
import BigNumber from "bignumber.js";
import {Amount, PoolId} from "../types/dex-types";
import {ShadeRoutePoolEssential} from "./types";
export type ShadeRoutePoolEssentialsIdMap = { [p: string]: ShadeRoutePoolEssential; };

export default class ShadeCalc {
  private readonly routePairsById: ShadeRoutePoolEssentialsIdMap;

  constructor(pairs: ShadeRoutePoolEssentialsIdMap) {
    this.routePairsById = pairs;
  }
  calculatePathQuotaByEnding({
                               endingTokenAmount: endingTokenAmount,
                               endingTokenId: endingTokenId,
                               path: path,
                             }) {
    const {getTokenDecimals: getTokenDecimals} = useTokens()
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
      inputAmount,
      quoteOutputAmount: endingTokenAmount,
      quoteShadeDaoFee,
      quoteLPFee: quoteLpFee,
      priceImpact,
      sourceTokenId,
      targetTokenId: endingTokenId,
      route: hopsButAlsoRouteUnclear,
    };
  }

  public calculatePathOutcome({
                                 startingTokenAmount: startingTokenAmount,
                                 startingTokenId: startingTokenId,
                                 path: path,
                               }: {
    startingTokenAmount: Amount,
    startingTokenId: string,
    path: PoolId[],
  }) {
    const g = useTokens()
      , {getTokenDecimals: getTokenDecimals} = g
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
              inputToken0Amount,
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
          throw Error(`Invalid trade size ${e.message} at path = ${poolId}`);
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

  private getPoolById(poolId: PoolId): ShadeRoutePoolEssential {
    return this.routePairsById[poolId];
  }

  private isStablePool(poolId: PoolId) {
    return this.getPoolById(poolId).stableParams !== null;
  }
}
