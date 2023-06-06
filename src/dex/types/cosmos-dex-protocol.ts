import {DexProtocol} from "./dex-protocol";
import {DexProtocolName} from "./dex-types";
import {Observable, Subject} from "rxjs";
import createCosmosObserver from "../utils/cosmosObserver";

export abstract class CosmosDexProtocol<T extends DexProtocolName> extends DexProtocol<T> {
  private cosmosObserver: Subject<number>;

  protected constructor (public readonly rpcEndpoint: string, public readonly retryTime = 1000) {
    super();
    this.cosmosObserver = createCosmosObserver(this.rpcEndpoint, this.retryTime);
  }

  subscribeToDexHeights(): Observable<{ height: number }> {
    return new Observable<{ height: number }>(observer => {
      this.cosmosObserver.subscribe(blockHeight => {
        observer.next({height: blockHeight})
      }, error => console.error(error));
    });
  }
}
