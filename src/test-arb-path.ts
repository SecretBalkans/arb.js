import {
  ArbCalculator,
  ArbitrageMonitorMaster,
  ArbPair, ArbPairUpdateLight,
  DexProtocolsUpdateFull,
  DexStore
} from './arbitrage/dexArbitrage';
import {DexProtocolName, SwapToken} from './dex/types/dex-types';
import OsmosisSwap from './dex/osmosis/osmosisSwap';
import ShadeSwap from './dex/shade/shadeSwap';
import ArbMonitorUploader, {execute} from './monitor/arb-upload';
import {subscribePrices} from "./prices/prices";
import _ from "lodash";
import config from './config';
import cluster from "cluster";
import ipc from 'node-ipc';
import {Logger} from "./utils";
import {Subject} from "rxjs";
import {getPairsRaw, initShadeTokens} from "./dex/shade/shade-api-utils";

if (config.maxProcessCount > 1 && cluster.isMaster) {
  for (let i = 1; i < config.maxProcessCount; i++) {
    cluster.fork()
  }
}
if (cluster.isMaster) {
  console.log(_.pick(config, ['maxProcessCount']));
}
const dexProtocols = [
  new OsmosisSwap(process.env.OSMO_RPC_ENDPOINT || 'https://osmosis-rpc.polkachu.com',
    process.env.OSMO_REST_ENDPOJNT || 'https://osmosis-api.polkachu.com',
    10000),
  new ShadeSwap(process.env.SECRET_RPC_ENDPOJNT || 'https://rpc-secret.whispernode.com:443',
    process.env.SECRET_USE_ONLY_SHADE_API ?
      JSON.parse(process.env.SECRET_USE_ONLY_SHADE_API) : !!1)
];
const dexStore = new DexStore(dexProtocols);
let logger;
(async () => {

  ipc.config.appspace = 'arbjs';

  ipc.config.silent = true;
  ipc.config.logInColor = false; // default
  ipc.config.logDepth = 1; // default

  const processIndex = cluster.isMaster ? 1 : cluster.worker.id + 1;
  console.log(`Spawned worker: ${processIndex}`);
  const pairs = await execute(`query getArbPairs {
    arb_pairs(where:{ version:{_eq: 1}}) {
      arb_pairs
      updated_at
    }
  }
  `)
  const allPairs = (pairs.data.arb_pairs[0].arb_pairs as [string, string][]).map<ArbPair>(([t0, t1]) => ([SwapToken[t0], SwapToken[t1]]));
  const processPairs = _.filter(allPairs, ($, index) => index % config.maxProcessCount === processIndex - 1);

  if (cluster.isMaster) {
    logger = new Logger('MasterArb');
    const arbitrageMonitor = new ArbitrageMonitorMaster(dexStore, allPairs);

    const obs = arbitrageMonitor.subscribeArbs();
    const masterUploader = new ArbMonitorUploader({
      arbs: {
        obs: {
          full: obs.asObservable()
        },
        calculator: new ArbCalculator(dexProtocols, processPairs)
      },
      heightsObs: arbitrageMonitor.subscribeHeights(),
      pricesObs: await subscribePrices()
    })
    ipc.config.id = 'ArbMaster';
    ipc.config.retry = 1000;
    const lastUpdates: Partial<Record<DexProtocolName, number>> = {};
    obs.subscribe((d) => {
      if(_.some(d.d, (update) => {
        return lastUpdates[update.dexName] !== update.height;
      })) {
        d.d.forEach((update) => lastUpdates[update.dexName] = update.height)
        // noinspection TypeScriptValidateJSTypes
        ipc.server.broadcast('dexProtocolsUpdateTopic', d.d)
      }
      // noinspection TypeScriptValidateJSTypes
      ipc.server.broadcast('arbPairUpdateTopic', d.pair);
    })
    ipc.serve(
      () => {
        ipc.server.on(
          'online',
          id => {
            logger.log('Connection from', id);
          },
        );
      },
    );
    ipc.server.start();
  } else {
    logger = new Logger(`Worker${processIndex}`);
    ipc.config.id = `Worker${processIndex}`;
    ipc.config.retry = 1000;
    logger.log(`Started. Will connect to Master.`);
    const pairsObs = new Subject<ArbPairUpdateLight>();
    const dexObs = new Subject<DexProtocolsUpdateFull>();
    await Promise.all([
      initShadeTokens(),
      getPairsRaw(),
    ])
    ipc.connectTo(
      'ArbMaster',
      () => {
        ipc.of.ArbMaster.on(
          'arbPairUpdateTopic',
          (data: ArbPairUpdateLight) => {
            pairsObs.next(data);
          },
        );
        ipc.of.ArbMaster.on(
          'dexProtocolsUpdateTopic',
          (data: DexProtocolsUpdateFull) => {
            dexObs.next(data);
          },
        );
        ipc.of.ArbMaster.emit('online', processIndex);
      },
    );
    const arbUploader = new ArbMonitorUploader({
      arbs: {
        obs: {
          light: {
            pairs: pairsObs.asObservable(),
            dexUpdates: dexObs.asObservable(),
          }
        },
        calculator: new ArbCalculator(dexProtocols, processPairs)
      },
    })
  }

  logger.log(`Will calculate pairs ${processPairs.length}/${allPairs.length}`);
})();
