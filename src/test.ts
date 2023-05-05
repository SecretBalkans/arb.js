import { getPegPrice, getShadePairs, tokens } from './dex/shade';
import _ from 'lodash';
import { calculateBestShadeSwapRoutes, printShadeSwapRoute } from './dex/shade';
import BigNumber from 'bignumber.js';
import { toBase64 } from '@cosmjs/encoding';
import { PoolId } from './dex/types/swap-types';

(async () => {
  console.log(toBase64(Buffer.from('string', 'ascii')))

  // noinspection InfiniteLoopJS
  while (true) {
    console.time('cycle');
    // Always called to initialize the Shade protocol local store
    const peg = await getPegPrice();
    const pairs = await getShadePairs();

    // This is how we use the basic function for swapping
    const startingTokenId = _.find(tokens, { symbol: 'SILK' }).id;
    const endingTokenId = _.find(tokens, { symbol: 'SHD' }).id;
    calculateBestShadeSwapRoutes({
      inputTokenAmount: BigNumber(10*(10**6)),
      startingTokenId: startingTokenId,
      endingTokenId: endingTokenId,
      isReverse: false,
      maxHops: 6,
      pools: pairs.map(d => d.rawInfo.id as PoolId)
    })
    .map(printShadeSwapRoute); // we print the calculated routes

    // Prints the basic arb opportunity based on oracle prices (not other dex's swap prices) of the pools
    _(pairs).filter(d => !d.rawInfo.flags.includes('stable')).sortBy('skewPercentage').reverse().forEach((d) => {
      return console.log(...[d.name.split(' ')[0], `${(d.skew * 100).toFixed(2)}%`, `${d.token0PoolPrice.toFixed(2)} / ${d.token1PoolPrice.toFixed(2)}`]);
    });
    console.log('Silk peg', peg);
    // finally show how long it takes to load the current cycle.
    // In general it should be faster than a single block-time
    console.timeEnd('cycle');
    console.log('----------------------------');

    // basic cycle logic for re-entry of testing
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
})();
