import {
  ArbitrageMonitorCalculator,
  ArbitrageMonitorMaster,
  ArbPair, ArbPairSerializedUpdate,
  DexStore,
  SerializedDexProtocolsUpdate
} from './arbitrage/dexArbitrage';
import {SwapToken} from './dex/types/dex-types';
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

if (config.maxProcessCount > 1 && cluster.isMaster) {
  for (let i = 1; i < config.maxProcessCount; i++) {
    cluster.fork()
  }
}
if (cluster.isMaster) {
  console.log(_.pick(config, ['maxProcessCount']));
}
const dexProtocols = [
  new OsmosisSwap('https://osmosis-rpc.polkachu.com',
    'https://api-osmosis-ia.cosmosia.notional.ventures',
    10000),
  new ShadeSwap('https://rpc-secret.whispernode.com:443',
    !!1)
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
        obs: obs.asObservable(),
        calculator: new ArbitrageMonitorCalculator(dexProtocols, processPairs)
      },
      heightsObs: arbitrageMonitor.subscribeHeights(),
      pricesObs: await subscribePrices()
    })
    ipc.config.id = 'ArbMaster';
    ipc.config.retry = 1000;
    obs.subscribe((d) => {
      ipc.server.broadcast('arbDexUpdate', d);
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
    const workerId = cluster.worker.id;
    logger = new Logger(`Worker${workerId}`);
    ipc.config.id = `Worker${workerId}`;
    ipc.config.retry = 1000;
    logger.log(`Started. Will connect to aster.`);
    const arbObs = new Subject<ArbPairSerializedUpdate>();
    ipc.connectTo(
      'ArbMaster',
      () => {
        ipc.of.ArbMaster.on(
          'arbDexUpdate',
          (data: ArbPairSerializedUpdate) => {
            arbObs.next(data);
          },
        );
        ipc.of.ArbMaster.emit('online', workerId);
      },
    );

    const arbUploader = new ArbMonitorUploader({
      arbs: {
        obs: arbObs.asObservable(),
        calculator: new ArbitrageMonitorCalculator(dexProtocols, processPairs)
      },
    })
  }

  logger.log(`Will calculate pairs ${processPairs.length}/${allPairs.length}`);
})();
