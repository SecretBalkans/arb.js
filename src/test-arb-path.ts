import {ArbitrageMonitor, DexStore} from './arbitrage/dexArbitrage';
import {SwapToken} from './dex/types/dex-types';
import OsmosisSwap from './dex/osmosis/osmosisSwap';
import ShadeSwap from './dex/shade/shadeSwap';
import ArbMonitorUploader from './monitor/arb-upload';

(async () => {
  const dexStore = new DexStore([
      new OsmosisSwap('https://rpc-osmosis.ecostake.com', 'https://osmosis-api.lavenderfive.com:443'),
      new ShadeSwap('https://rpc.secret.express', true)
    ]
  );
  /*const basicSub = dexStore.subscribeDexProtocolsCombined().subscribe({
    next(d) {
      console.log(`${d[0].height}/${d[0].pools.length}, ${d[1].height}/${d[1].pools.length}`);
    },
    error(err) {
      console.error(err);
    },
  });*/
  const arbitrage = new ArbitrageMonitor(dexStore, [
    [SwapToken.SCRT, SwapToken.USDC],
    [SwapToken.SCRT, SwapToken.OSMO],
    [SwapToken.SCRT, SwapToken.ATOM],
    [SwapToken.SCRT, SwapToken.BLD],
    [SwapToken.SCRT, SwapToken.IST],
    [SwapToken.SCRT, SwapToken.CMST],
    [SwapToken.SCRT, SwapToken.CMST],
    [SwapToken.SCRT, SwapToken.stOSMO],
    [SwapToken.SCRT, SwapToken.qATOM],
    [SwapToken.SCRT, SwapToken.INJ],
    [SwapToken.CMST, SwapToken.IST],
    [SwapToken.BLD, SwapToken.USDC],
    [SwapToken.USDT, SwapToken.USDC],
    [SwapToken.ATOM, SwapToken.USDC],
    [SwapToken.ATOM, SwapToken.stkATOM],
    [SwapToken.ATOM, SwapToken.OSMO],
    [SwapToken.ATOM, SwapToken.qATOM],
    [SwapToken.stATOM, SwapToken.stOSMO],
    [SwapToken.stOSMO, SwapToken.USDC],
    [SwapToken.stATOM, SwapToken.ATOM],
    [SwapToken.stOSMO, SwapToken.OSMO],
    [SwapToken.stJUNO, SwapToken.JUNO],
    [SwapToken.OSMO, SwapToken.USDC],
    [SwapToken.INJ, SwapToken.USDC],
    [SwapToken.INJ, SwapToken.stINJ],
    [SwapToken.USDC, SwapToken.stkATOM],
    [SwapToken.USDC, SwapToken.qATOM],
    [SwapToken.USDC, SwapToken.WBTC],
    [SwapToken.USDC, SwapToken.WETH],
    [SwapToken.SCRT, SwapToken.WBTC],
    [SwapToken.SCRT, SwapToken.WETH],
    [SwapToken.WETH, SwapToken.WBTC],
  ]);

  // arbitrage.subscribeArbs().subscribe({
  //   next(arbPaths) {
  //     logger.log(_.sortBy(arbPaths, 'winPercentage').reverse().map(ap=> ap?.toString()));
  //   },
  // });

  const arbUploader = new ArbMonitorUploader(arbitrage)
  /*
  while (true) {
    console.time('cycle');
    // Always called to initialize the Shade protocol local store
    await Promise.all([
      getPegPrice(),
      getShadePairs(),
      getOsmoPools(),
    ]);

    // // This is how we use the basic function for swapping
    const endingToken = getShadeTokenBySymbol('USDC.axl');
    const startingToken = getShadeTokenBySymbol('SCRT');
    const startingAmount = 1000;
    const tokenInOsmoDecimals = 6;
    const tokenOutOsmoDecimals = 6;
    // USDC on Osmosis
    const tokenInDenomOsmo = makeIBCMinimalDenom('channel-208', 'uusdc');
    // SCRT on Osmosis
    const tokenOutDenomOsmo = makeIBCMinimalDenom('channel-88', 'uscrt');
    const [shadeRoute] = calculateBestShadeSwapRoutes({
      inputTokenAmount: BigNumber(startingAmount * (10 ** startingToken.decimals)),
      startingTokenId: startingToken.id,
      endingTokenId: endingToken.id,
      isReverse: false,
      maxHops: 6,
    });
    const [osmo] = calculateBestOsmosisSwapRoute({
      tokenInAmount: shadeRoute.quoteOutputAmount.dividedBy(10 ** endingToken.decimals).multipliedBy(10 ** tokenInOsmoDecimals),
      tokenOutDenom: tokenOutDenomOsmo,
      tokenInDenom: tokenInDenomOsmo,
    });

    console.log(convertCoinFromUDenomV2(shadeRoute.inputAmount.toString(), startingToken.decimals).toFixed(4), startingToken.symbol, '-> shade ->', convertCoinFromUDenomV2(shadeRoute.quoteOutputAmount.toString(), endingToken.decimals).toFixed(4), endingToken.symbol);
    console.log(convertCoinFromUDenomV2(shadeRoute.quoteOutputAmount.toString(), endingToken.decimals).toFixed(4), endingToken.symbol, '-> osmo ->', convertCoinFromUDenomV2(osmo.out.toString(), tokenOutOsmoDecimals).toString(), startingToken.symbol);


    // finally show how long it takes to load the current cycle.
    // In general it should be faster than a single block-time
    console.timeEnd('cycle');
    console.log('----------------------------');

    // basic cycle logic for re-entry of testing
    await new Promise(resolve => setTimeout(resolve, 5000));
  }*/
})();
