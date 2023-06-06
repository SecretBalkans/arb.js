import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import {Observable, Subject} from 'rxjs';
import {Logger} from "../../utils";
export default function cosmosObserver(rpcEndpoint: string, retryTime = 500): Subject<number> {
  const subject = new Subject<number>()
  const logger = new Logger(rpcEndpoint);
  (async () => {
    const t34Client = await Tendermint34Client.connect(rpcEndpoint);

    let prevHeight;
    // noinspection InfiniteLoopJS
    do {
      let lastBlock;
      do {
        try {
          lastBlock = (await t34Client.block()) || lastBlock;
          // tslint:disable-next-line:no-empty
        } catch(err) {
          logger.error(err);
        }
        if (lastBlock && (!prevHeight || prevHeight < lastBlock.block.header.height)) {
          prevHeight = lastBlock.block.header.height;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, retryTime));
      } while (true);
      subject.next(prevHeight);
    } while (true);
  })().catch(subject.error.bind(subject));
  return subject;
}
