import { ArbitrageMonitor, DexStore } from './arbitrage/dexArbitrage';
import { SwapToken } from './dex/types/dex-types';
import OsmosisSwap from './dex/osmosis/osmosisSwap';
import ShadeSwap from './dex/shade/shadeSwap';
import _ from 'lodash';
import { Logger } from './utils';
const logger = new Logger('ArbM');
(async () => {
  const dexStore = new DexStore([
    new OsmosisSwap('https://rpc-osmosis.ecostake.com'),
    new ShadeSwap('https://rpc-secret.whispernode.com:443')
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
    [SwapToken.CMST, SwapToken.IST],
    [SwapToken.BLD, SwapToken.USDC],
    [SwapToken.USDT, SwapToken.USDC],
    [SwapToken.ATOM, SwapToken.USDC],
    [SwapToken.OSMO, SwapToken.USDC],
    [SwapToken.ATOM, SwapToken.OSMO],
    [SwapToken.stATOM, SwapToken.stOSMO],
    [SwapToken.stOSMO, SwapToken.USDC],
    [SwapToken.stATOM, SwapToken.ATOM],
    [SwapToken.stOSMO, SwapToken.OSMO],
    [SwapToken.stJUNO, SwapToken.JUNO],
    // [SwapToken.stINJ, SwapToken.INJ],
    // [SwapToken.stLUNA, SwapToken.LUNA],
  ]);

  arbitrage.subscribeArbs().subscribe({
    next(arbPaths) {
      logger.log(_.sortBy(arbPaths, 'winPercentage').reverse().map(ap=> ap?.toString()));
    },
  });
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
