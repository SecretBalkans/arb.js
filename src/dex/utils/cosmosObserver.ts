import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import { Observable } from 'rxjs';
export default function cosmosObserver(rpcEndpoint: string, retryTime = 300): Observable<number> {
  return new Observable(observer => {
    (async () => {
      const t34Client = await Tendermint34Client.connect(rpcEndpoint);

      let prevHeight;
      // noinspection InfiniteLoopJS
      do {
        let lastBlock;
        do {
          try {
            lastBlock = (await t34Client.block()) || lastBlock;
          } catch {}
          if (lastBlock && (!prevHeight || prevHeight < lastBlock.block.header.height)) {
            prevHeight = lastBlock.block.header.height;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, retryTime));
        } while (true);
        observer.next(prevHeight);
      } while (true);
    })().catch(observer.error);
  });
}
