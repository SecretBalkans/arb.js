import BigNumber from 'bignumber.js';
import { TheStore, useTokens } from './shade-rest';
import { convertCoinFromUDenomV2, convertCoinToUDenomV2 } from '../../utils/denoms';

let math = BigNumber;

class StableSwapSimulator {
  pool0Size: any;
  priceOfToken1: any;
  pool1Size: any;
  gamma1: any;
  gamma2: any;
  lpFee: any;
  shadeDaoFee: any;
  minTradeSize0For1: any;
  invariant: any;
  minTradeSize1For0: any;
  priceImpactLimit: any;
  a: any;

  constructor(e, t, n, o, s, a, r, l, d, u, p) {
    BigNumber.set({
      DECIMAL_PLACES: 30,
    }),
      this.pool0Size = e,
      this.pool1Size = t,
      this.priceOfToken1 = n,
      this.a = o,
      this.gamma1 = s,
      this.gamma2 = a,
      this.lpFee = r,
      this.shadeDaoFee = l,
      this.invariant = this.calculateInvariant(),
      this.minTradeSize0For1 = d,
      this.minTradeSize1For0 = u,
      this.priceImpactLimit = p;
  }

  solveInvFnForPool1Size(e) {
    const t = e.dividedBy(this.invariant)
      , n = a => this.invariantFnFromPoolSizes(t, a)
      , o = a => this.derivRespectToPool1OfInvFn(t, a);
    return this.findZeroWithPool1Params(n, o).multipliedBy(this.invariant).dividedBy(this.priceOfToken1);
  }

  solveInvFnForPool0Size(e) {
    const t = e.dividedBy(this.invariant)
      , n = a => this.invariantFnFromPoolSizes(a, t)
      , o = a => this.derivRespectToPool0OfInvFnFromPool0(a, t);
    return this.findZeroWithPool0Params(n, o).multipliedBy(this.invariant);
  }

  swapToken0WithToken1(e) {
    const t = this.simulateToken0WithToken1Trade(e);
    return this.executeTrade(t);
  }

  swapToken1WithToken0(e) {
    const t = this.simulateToken1WithToken0Trade(e);
    return this.executeTrade(t);
  }

  executeTrade(e) {
    return this.pool0Size = e.newPool0,
      this.pool1Size = e.newPool1,
      this.calculateInvariant(),
      e.tradeReturn;
  }

  simulateReverseToken0WithToken1Trade(e) {
    const t = this.lpFee.multipliedBy(e)
      , n = this.shadeDaoFee.multipliedBy(e)
      , o = t.plus(n)
      , s = e.minus(o)
      , a = this.pool1Size.minus(e)
      , r = a.multipliedBy(this.priceOfToken1)
      , l = this.solveInvFnForPool0Size(r);
    this.verifySwapPriceImpactInBounds(l, a, !0);
    const d = l.minus(this.pool0Size);
    validateTradeSize(d, this.minTradeSize0For1);
    const u = a.plus(t);
    return {
      newPool0: l,
      newPool1: u,
      tradeInput: d,
      tradeReturn: s,
      lpFeeAmount: t,
      shadeDaoFeeAmount: n,
    };
  }

  simulateReverseToken1WithToken0Trade(e) {
    const t = this.lpFee.multipliedBy(e)
      , n = this.shadeDaoFee.multipliedBy(e)
      , o = t.plus(n)
      , s = e.minus(o)
      , a = this.pool0Size.minus(e)
      , r = this.solveInvFnForPool1Size(a);
    this.verifySwapPriceImpactInBounds(a, r, !1);
    const l = r.minus(this.pool1Size);
    return validateTradeSize(l, this.minTradeSize1For0),
      {
        newPool0: a.plus(t),
        newPool1: r,
        tradeInput: l,
        tradeReturn: s,
        lpFeeAmount: t,
        shadeDaoFeeAmount: n,
      };
  }

  simulateToken0WithToken1Trade(e) {
    validateTradeSize(e, this.minTradeSize0For1);
    const t = this.pool0Size.plus(e)
      , n = this.solveInvFnForPool1Size(t);
    this.verifySwapPriceImpactInBounds(t, n, !0);
    const o = this.pool1Size.minus(n)
      , s = this.lpFee.multipliedBy(o)
      , a = this.shadeDaoFee.multipliedBy(o)
      , r = n.plus(s);
    return {
      newPool0: t,
      newPool1: r,
      tradeReturn: o.minus(s).minus(a),
      lpFeeAmount: s,
      shadeDaoFeeAmount: a,
    };
  }

  simulateToken1WithToken0Trade(e) {
    validateTradeSize(e, this.minTradeSize1For0);
    const t = this.pool1Size.plus(e)
      , n = this.priceOfToken1.multipliedBy(t)
      , o = this.solveInvFnForPool0Size(n);
    this.verifySwapPriceImpactInBounds(o, t, !1);
    const s = this.pool0Size.minus(o)
      , a = this.lpFee.multipliedBy(s)
      , r = this.shadeDaoFee.multipliedBy(s);
    return {
      newPool0: o.plus(a),
      newPool1: t,
      tradeReturn: s.minus(a).minus(r),
      lpFeeAmount: a,
      shadeDaoFeeAmount: r,
    };
  }

  verifySwapPriceImpactInBounds(e, t, n) {
    const o = this.priceImpactAt(e, t, n);
    if (o.isGreaterThan(this.priceImpactLimit) || o.isLessThan(math(0)))
      throw Error(`The slippage of this trade is outside of the acceptable range of 0% - ${this.priceImpactLimit}%.`);
  }

  priceImpactAt(e, t, n) {
    const o = n ? this.priceToken1() : this.priceToken0();
    return (n ? this.priceToken1At(e, t) : this.priceToken0At(e, t)).dividedBy(o).minus(math(1)).multipliedBy(100);
  }

  priceImpactToken0ForToken1(e) {
    const t = this.pool0Size.plus(e)
      , n = this.solveInvFnForPool1Size(t);
    return this.priceImpactAt(t, n, !0);
  }

  priceImpactToken1ForToken0(e) {
    const t = this.pool1Size.plus(e)
      , n = this.solveInvFnForPool0Size(this.priceOfToken1.multipliedBy(t));
    return this.priceImpactAt(n, t, !1);
  }

  negativeTangent(e, t) {
    return this.derivRespectToPool0OfInvFnFromPool0(e, t).dividedBy(this.derivRespectToPool1OfInvFn(e, t)).dividedBy(this.priceOfToken1);
  }

  priceToken1At(e, t) {
    return math(1).dividedBy(this.negativeTangent(e.dividedBy(this.invariant), this.priceOfToken1.multipliedBy(t).dividedBy(this.invariant)));
  }

  priceToken1() {
    return this.priceToken1At(this.pool0Size, this.pool1Size);
  }

  priceToken0At(e, t) {
    return this.negativeTangent(e.dividedBy(this.invariant), this.priceOfToken1.multipliedBy(t).dividedBy(this.invariant));
  }

  priceToken0() {
    return this.priceToken0At(this.pool0Size, this.pool1Size);
  }

  updatePriceOfToken1(e) {
    this.priceOfToken1 = e,
      this.calculateInvariant();
  }

  token1TvlInUnitsToken0() {
    return this.priceOfToken1.multipliedBy(this.pool1Size);
  }

  totalTvl() {
    return this.pool0Size.plus(this.token1TvlInUnitsToken0());
  }

  geometricMeanDoubled() {
    const e = this.token1TvlInUnitsToken0();
    return this.pool0Size.isLessThanOrEqualTo(math(1)) || e.isLessThanOrEqualTo(math(1)) ? math(0) : this.pool0Size.sqrt().multipliedBy(e.sqrt()).multipliedBy(math(2));
  }

  calculateInvariant() {
    const e = this.token1TvlInUnitsToken0()
      , t = this.pool0Size.isLessThanOrEqualTo(e) ? this.gamma1 : this.gamma2
      , n = a => this.invariantFnFromInv(a, t)
      , o = a => this.derivRespectToInvOfInvFn(a, t)
      , s = this.findZeroWithInvariantParams(n, o);
    return this.invariant = s,
      s;
  }

  invariantFnFromInv(e, t) {
    const n = this.token1TvlInUnitsToken0()
      , s = this.getCoeffScaledByInv(e, t, n).multipliedBy(e.multipliedBy(this.pool0Size.plus(n.minus(e))))
      , a = this.pool0Size.multipliedBy(n)
      , r = e.multipliedBy(e).dividedBy(4);
    return s.plus(a).minus(r);
  }

  derivRespectToInvOfInvFn(e, t) {
    const n = this.token1TvlInUnitsToken0()
      , o = this.getCoeffScaledByInv(e, t, n)
      , s = math(-2).multipliedBy(t).plus(1).multipliedBy(this.pool0Size.minus(e).plus(n)).minus(e);
    return o.multipliedBy(s).minus(e.dividedBy(2));
  }

  getCoeffScaledByInv(e, t, n) {
    return this.a.multipliedBy(math(4).multipliedBy(this.pool0Size.dividedBy(e)).multipliedBy(n.dividedBy(e)).pow(t));
  }

  getCoeff(e, t, n) {
    const o = e.multipliedBy(t);
    return this.a.multipliedBy(math(4).multipliedBy(o).pow(n));
  }

  invariantFnFromPoolSizes(e, t) {
    const n = e.isLessThanOrEqualTo(t) ? this.gamma1 : this.gamma2
      , o = e.multipliedBy(t);
    return this.getCoeff(e, t, n).multipliedBy(e.plus(t).minus(1)).plus(o).minus(.25);
  }

  derivRespectToPool0OfInvFnFromPool0(e, t) {
    const n = e.isLessThanOrEqualTo(t) ? this.gamma1 : this.gamma2
      , o = this.getCoeff(e, t, n)
      , s = n.multipliedBy(e.plus(t).minus(1)).dividedBy(e).plus(1);
    return o.multipliedBy(s).plus(t);
  }

  derivRespectToPool1OfInvFn(e, t) {
    const n = e.isLessThanOrEqualTo(t) ? this.gamma1 : this.gamma2
      , o = this.getCoeff(e, t, n)
      , s = n.multipliedBy(e.plus(t).minus(1).dividedBy(t)).plus(1);
    return o.multipliedBy(s).plus(e);
  }

  findZeroWithInvariantParams(e, t) {
    const n = this.totalTvl();
    return S(e, t, n, n, !0, this.geometricMeanDoubled, void 0);
  }

  findZeroWithPool0Params(e, t) {
    const n = this.pool0Size.dividedBy(this.invariant);
    return S(e, t, n, n, !1, void 0, math(0));
  }

  findZeroWithPool1Params(e, t) {
    const n = this.token1TvlInUnitsToken0().dividedBy(this.invariant);
    return S(e, t, n, n, !1, void 0, math(0));
  }
}

function findPaths({ startingTokenId: startingTokenId, endingTokenId: endingTokenId, maxHops: maxHops, pools: pools }) {
  const tmpArr = []
    , result = []
    , someSet = new Set;

  function theFunction(f, someIndex) {
    if (!(someIndex > maxHops)) {
      if (f === endingTokenId) {
        result.push([...tmpArr]);
        return;
      }
      Object.entries(pools).forEach(([F, P]: any) => {
          someSet.has(F) || (P.token0Id === f || P.token1Id === f) && (tmpArr.push(F),
            someSet.add(F),
            P.token0Id === f ? theFunction(P.token1Id, someIndex + 1) : theFunction(P.token0Id, someIndex + 1),
            someSet.delete(F),
            tmpArr.pop());
        },
      );
    }
  }

  return theFunction(startingTokenId, 0),
    result;
}

function calculatePathOutcome({
                                startingTokenAmount: startingTokenAmount,
                                startingTokenId: startingTokenId,
                                path: path,
                              }) {
  const k = TheStore()
    , { isStablePool: isStablePool, getPoolById: getPoolById } = k
    , g = useTokens()
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
      const poolPairInfo = getPoolById(poolId);
      // , he = parseRawPool(poolPairInfo);
      ne.push(poolPairInfo);
      const token0Decimals = getTokenDecimals(poolPairInfo.token0Id)
        , token1Decimals = getTokenDecimals(poolPairInfo.token1Id)
        , token0AmountInDenom = poolPairInfo.token0Amount.multipliedBy(math(10).pow(token0Decimals))
        , token1AmountInDenom = poolPairInfo.token1Amount.multipliedBy(math(10).pow(token1Decimals))
        , outputTokenDecimals = getTokenDecimals(outputTokenId)
        , outputAmountString = quoteOutputAmount.toString()
        , inputToken0Amount = convertCoinFromUDenomV2(outputAmountString, outputTokenDecimals);
      let otherTokenId;
      outputTokenId === poolPairInfo.token0Id ? otherTokenId = poolPairInfo.token1Id : otherTokenId = poolPairInfo.token0Id;
      const otherTokenDecimals = getTokenDecimals(otherTokenId);
      if (isStablePool(poolId))
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
          otherTokenDenomAmount = math(convertCoinToUDenomV2(otherTokenAmount, otherTokenDecimals)),
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
          otherTokenDenomAmount = math(convertCoinToUDenomV2(V, otherTokenDecimals)),
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
      quoteShadeDaoFee: math(0),
      quoteLPFee: math(0),
      quotePriceImpact: math(0),
      hops: [],
    })
    , {
    outputTokenId: $,
    quoteOutputAmount: F,
    quoteShadeDaoFee: P,
    quoteLPFee: I,
    quotePriceImpact: d,
    hops: _,
  } = pathReduceResult;
  return {
    inputAmount: startingTokenAmount,
    quoteOutputAmount: F,
    quoteShadeDaoFee: P,
    quoteLPFee: I,
    priceImpact: d,
    sourceTokenId: startingTokenId,
    targetTokenId: $,
    route: _,
  };
}

function calculatePathQuotaByEnding({
                                      endingTokenAmount: endingTokenAmount,
                                      endingTokenId: endingTokenId,
                                      path: path,
                                    }) {
  const k = TheStore()
    , { isStablePool: isStablePool, getPoolById: getPoolByIdFn } = k
    , utils1 = useTokens()
    , { getTokenDecimals: getTokenDecimals } = utils1
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
    const poolPairInfo = getPoolByIdFn(poolId);
    numOfHops.unshift(poolPairInfo);
    const token0Decimals = getTokenDecimals(poolPairInfo.token0Id)
      , token1Decimals = getTokenDecimals(poolPairInfo.token1Id)
      , token0AmountInDenom = poolPairInfo.token0Amount.multipliedBy(math(10).pow(token0Decimals))
      , token1AmountInDenom = poolPairInfo.token1Amount.multipliedBy(math(10).pow(token1Decimals))
      , inputTokenDecimals = getTokenDecimals(inputTokenId)
      , inputAmount = quoteInputAmount.toString()
      , l = convertCoinFromUDenomV2(inputAmount, inputTokenDecimals);
    let u;
    inputTokenId === poolPairInfo.token0Id ? u = poolPairInfo.token1Id : u = poolPairInfo.token0Id;
    const te = getTokenDecimals(u);
    if (isStablePool(poolId)) {
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
        otherTokenAmount = math(convertCoinToUDenomV2(startingInputTokenAmount, te));
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
        otherTokenAmount = math(convertCoinToUDenomV2(V, te));
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
    quoteShadeDaoFee: math(0),
    quoteLPFee: math(0),
    quotePriceImpact: math(0),
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

export function printShadeSwapRoute(route: ShadeSwapRoute) {
  console.dir({
    inputAmount: route.inputAmount.toString(),
    quoteOutputAmount: route.quoteOutputAmount.toString(),
    quoteShadeDaoFee: route.quoteShadeDaoFee.toString(),
    quoteLPFee: route.quoteLPFee.toString(),
    priceImpact: route.priceImpact.toString(),
    route: route.route,
  }, { depth: 5 });
}

interface ShadeSwapRoute {
  inputAmount: BigNumber;
  quoteOutputAmount: BigNumber;
  quoteShadeDaoFee: BigNumber;
  quoteLPFee: BigNumber;
  priceImpact: BigNumber;
  sourceTokenId: string;
  targetTokenId: string;
  route: any[];
}

export function calculateBestShadeSwapRoutes({
                                               inputTokenAmount: tokenAmount,
                                               startingTokenId: startingTokenId,
                                               endingTokenId: endingTokenId,
                                               maxHops: maxHops,
                                               isReverse: h = !1,
                                             }): ShadeSwapRoute[] {
  const theStore = TheStore()
    , { pools: pools } = theStore
    , rawPaths = findPaths({
    startingTokenId: startingTokenId,
    endingTokenId: endingTokenId,
    maxHops: maxHops,
    pools: pools,
  });
  if (rawPaths.length === 0) {
    return [];
  }
  if (!h) {
    return rawPaths
      .reduce((agg, currentPath) => {
      try {
        const pathCalculation = calculatePathOutcome({
          startingTokenAmount: tokenAmount,
          startingTokenId: startingTokenId,
          path: currentPath,
        });
        return agg.push(pathCalculation),
          agg;
      } catch (err) {
        console.error(err);
        debugger;
        return agg;
      }
    }, [])
      .sort((d, _) => d.quoteOutputAmount.isGreaterThan(_.quoteOutputAmount) ? -1 : d.quoteOutputAmount.isLessThan(_.quoteOutputAmount) ? 1 : 0);
  } else {
    const $ = rawPaths.reduce((d, _) => {
        try {
          const D = calculatePathQuotaByEnding({
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
    return rawPaths.map(path => calculatePathOutcome({
      startingTokenAmount: P,
      startingTokenId: startingTokenId,
      path: path,
    })).map(d => JSON.stringify(d.route) === JSON.stringify(F.route) ? F : d)
      .sort((d, _) => JSON.stringify(d.route) === JSON.stringify(F.route) ? -1 : JSON.stringify(_.route) === JSON.stringify(F.route) ? 1 : d.quoteOutputAmount.isGreaterThan(_.quoteOutputAmount) ? -1 : d.quoteOutputAmount.isLessThan(_.quoteOutputAmount) ? 1 : 0);
  }
}

function stableSwapToken0ToToken1InPool(stablePoolParams: { inputToken0Amount: BigNumber; poolToken0Amount: BigNumber; poolToken1Amount: BigNumber; priceRatio: BigNumber; a: any; gamma1: any; gamma2: any; liquidityProviderFee: any; daoFee: any; minTradeSizeToken0For1: any; minTradeSizeToken1For0: any; priceImpactLimit: any; }) {
  const {
    inputToken0Amount: i,
    poolToken0Amount: e,
    poolToken1Amount: t,
    priceRatio: n,
    a: o,
    gamma1: s,
    gamma2: a,
    liquidityProviderFee: r,
    daoFee: l,
    minTradeSizeToken0For1: d,
    minTradeSizeToken1For0: u,
    priceImpactLimit: p,
  } = stablePoolParams;

  function m() {
    return BigNumber.set({
      DECIMAL_PLACES: 30,
    }), new StableSwapSimulator(e, t, n, o, s, a, r, l, d, u, p);
  }

  return m().swapToken0WithToken1(i);
}

/** PriceImpact */
function calculateStableSwapPriceImpactInputToken0({
                                                     inputToken0Amount: i,
                                                     poolToken0Amount: e,
                                                     poolToken1Amount: t,
                                                     priceRatio: n,
                                                     a: o,
                                                     gamma1: s,
                                                     gamma2: a,
                                                     liquidityProviderFee: r,
                                                     daoFee: l,
                                                     minTradeSizeToken0For1: d,
                                                     minTradeSizeToken1For0: u,
                                                     priceImpactLimit: p,
                                                   }): any {
  function m() {
    return BigNumber.set({
      DECIMAL_PLACES: 30,
    }),
      new StableSwapSimulator(e, t, n, o, s, a, r, l, d, u, p);
  }

  const h = m()
    , f = h.priceToken1()
    , g = h.swapToken0WithToken1(i).dividedBy(math(1).minus(r.plus(l)));
  return i.dividedBy(g).dividedBy(f).minus(1);
}

function stableSwapToken1ToToken0InPool({
                                          inputToken1Amount: i,
                                          poolToken0Amount: e,
                                          poolToken1Amount: t,
                                          priceRatio: n,
                                          a: o,
                                          gamma1: s,
                                          gamma2: a,
                                          liquidityProviderFee: r,
                                          daoFee: l,
                                          minTradeSizeToken0For1: d,
                                          minTradeSizeToken1For0: u,
                                          priceImpactLimit: p,
                                        }) {
  function m() {
    return BigNumber.set({
      DECIMAL_PLACES: 30,
    }),
      new StableSwapSimulator(e, t, n, o, s, a, r, l, d, u, p);
  }

  return m().swapToken1WithToken0(i);
}

function calculateStableSwapPriceImpactInputToken1({
                                                     inputToken1Amount: i,
                                                     poolToken0Amount: e,
                                                     poolToken1Amount: t,
                                                     priceRatio: n,
                                                     a: o,
                                                     gamma1: s,
                                                     gamma2: a,
                                                     liquidityProviderFee: r,
                                                     daoFee: l,
                                                     minTradeSizeToken0For1: d,
                                                     minTradeSizeToken1For0: u,
                                                     priceImpactLimit: p,
                                                   }) {
  function m() {
    return BigNumber.set({
      DECIMAL_PLACES: 30,
    }),
      new StableSwapSimulator(e, t, n, o, s, a, r, l, d, u, p);
  }

  const h = m()
    , f = h.priceToken0()
    , g = h.swapToken1WithToken0(i).dividedBy(math(1).minus(r.plus(l)));
  return i.dividedBy(g).dividedBy(f).minus(1);
}

function Fo({ token0LiquidityAmount: i, token1LiquidityAmount: e, token0InputAmount: t, fee: n }) {
  const o = e.minus(i.multipliedBy(e).dividedBy(i.plus(t)))
    , s = o.minus(o.multipliedBy(n));
  return math(s.toFixed(0));
}

function calculateXYKPriceImpactFromToken0Amount({
                                                   token0LiquidityAmount: i,
                                                   token1LiquidityAmount: e,
                                                   token0InputAmount: t,
                                                 }) {
  const n = i.dividedBy(e)
    , o = i.multipliedBy(e)
    , s = i.plus(t)
    , a = o.dividedBy(s)
    , r = e.minus(a);
  return t.dividedBy(r).dividedBy(n).minus(1);
}

function Ro({ token0LiquidityAmount: i, token1LiquidityAmount: e, token1InputAmount: t, fee: n }) {
  const o = i.minus(i.multipliedBy(e).dividedBy(e.plus(t)))
    , s = o.minus(o.multipliedBy(n));
  return math(s.toFixed(0));
}

function calculateXYKPriceImpactFromToken1Amount({
                                                   token0LiquidityAmount: i,
                                                   token1LiquidityAmount: e,
                                                   token1InputAmount: t,
                                                 }) {
  const n = e.dividedBy(i)
    , o = e.multipliedBy(i)
    , s = e.plus(t)
    , a = o.dividedBy(s)
    , r = i.minus(a);
  return t.dividedBy(r).dividedBy(n).minus(1);
}

function getTradeInputOfSimulateReverseToken0WithToken1Trade({
                                                               outputToken1Amount: i,
                                                               poolToken0Amount: e,
                                                               poolToken1Amount: t,
                                                               priceRatio: n,
                                                               a: o,
                                                               gamma1: s,
                                                               gamma2: a,
                                                               liquidityProviderFee: r,
                                                               daoFee: l,
                                                               minTradeSizeToken0For1: d,
                                                               minTradeSizeToken1For0: u,
                                                               priceImpactLimit: p,
                                                             }) {
  function m() {
    return BigNumber.set({
      DECIMAL_PLACES: 30,
    }),
      new StableSwapSimulator(e, t, n, o, s, a, r, l, d, u, p);
  }

  const h = r.plus(l)
    , f = i.dividedBy(math(1).minus(h));
  return m().simulateReverseToken0WithToken1Trade(f).tradeInput;
}

function getTradeInputOfSimulateReverseToken1WithToken0Trade({
                                                               outputToken0Amount: i,
                                                               poolToken0Amount: e,
                                                               poolToken1Amount: t,
                                                               priceRatio: n,
                                                               a: o,
                                                               gamma1: s,
                                                               gamma2: a,
                                                               liquidityProviderFee: r,
                                                               daoFee: l,
                                                               minTradeSizeToken0For1: d,
                                                               minTradeSizeToken1For0: u,
                                                               priceImpactLimit: p,
                                                             }) {
  function m() {
    return BigNumber.set({
      DECIMAL_PLACES: 30,
    }),
      new StableSwapSimulator(e, t, n, o, s, a, r, l, d, u, p);
  }

  const h = r.plus(l)
    , f = i.dividedBy(math(1).minus(h));
  return m().simulateReverseToken1WithToken0Trade(f).tradeInput;
}

function calculateXYKToken0AmountFromToken1Amount({
                                                    token0LiquidityAmount: i,
                                                    token1LiquidityAmount: e,
                                                    token1OutputAmount: t,
                                                    fee: n,
                                                  }) {
  if (t.isGreaterThanOrEqualTo(e))
    throw Error('Not enough liquidity for swap');
  const o = i.multipliedBy(e).dividedBy(t.dividedBy(math(1).minus(n)).minus(e)).plus(i).multipliedBy(-1);
  return math(o.toFixed(0));
}

function calculateXYKToken1AmountFromToken0Amount({
                                                    token0LiquidityAmount: i,
                                                    token1LiquidityAmount: e,
                                                    token0OutputAmount: t,
                                                    fee: n,
                                                  }) {
  if (t.isGreaterThanOrEqualTo(i))
    throw Error('Not enough liquidity for swap');
  const o = e.multipliedBy(i).dividedBy(t.dividedBy(math(1).minus(n)).minus(i)).plus(e).multipliedBy(-1);
  return math(o.toFixed(0));
}

function validateTradeSize(i, e) {
  if (i.isLessThanOrEqualTo(0))
    throw Error('Trade size must be positive');
  if (i.isLessThanOrEqualTo(e))
    throw Error(`Trade size must be larger than minimum trade size of ${e}`);
}

function S(i, e, t, n, o, s, a) {
  const r = math(1e-16)
    , l = 80
    , d = 150;
  try {
    const u = J(i, e, t, r, l);
    if (!o || u.isGreaterThanOrEqualTo(0))
      return u;
  } catch (u) {
    debugger;
    if (!(u instanceof NewtonMethodError))
      throw u;
  }
  if (a !== void 0)
    return A(i, a, n, r, d);
  if (s !== void 0)
    return A(i, s(), n, r, d);
  throw Error('No lower bound was found for bisect');
}

function A(i, e, t, n, o) {
  const s = i(e)
    , a = i(t);
  if (s.isEqualTo(0))
    return e;
  if (a.isEqualTo(0))
    return t;
  if (s.isGreaterThan(0) && a.isGreaterThan(0) || s.isLessThan(0) && a.isLessThan(0))
    throw Error('bisect endpoints must have different signs');
  let r = t.minus(e)
    , l = e;
  for (let d = 0; d < o; d += 1) {
    r = r.multipliedBy(math(.5));
    const u = l.plus(r)
      , p = i(u);
    if (s.multipliedBy(p).isGreaterThanOrEqualTo(0) && (l = u),
    p || r.abs().isLessThanOrEqualTo(n))
      return u;
  }
  throw Error('Bisect exceeded max iterations');
}

function J(i, e, t, n, o) {
  let s = t;
  for (let a = 0; a < o; a += 1) {
    const r = s
      , l = i(s)
      , d = e(s);
    if (d.isEqualTo(0))
      throw new NewtonMethodError('Newton encountered slope of 0');
    if (s = s.minus(l.dividedBy(d)),
      s.minus(r).abs().isLessThanOrEqualTo(n))
      return s;
  }
  throw new NewtonMethodError('Newton exceeded max iterations');
}

class NewtonMethodError extends Error {
  constructor(e) {
    super(e),
      this.name = 'NewtonMethodError';
  }
}
