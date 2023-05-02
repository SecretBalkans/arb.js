import { Amount, DexProtocol, ICanSwap, ILivePoolStore, IPool, IRoute, PoolId, Token } from '../types/swap-types';
import { calculateBestShadeSwapRoutes } from './shade-calc';
import BigNumber from 'bignumber.js';
import { getShadePairs, getShadeTokenBySymbol } from './shade-rest';
import { convertCoinFromUDenomV2 } from '../../utils';
import { Observable } from 'rxjs';
import createCosmosObserver from '../utils/cosmosObserver';
import { toTokenId } from './tokens';

export * from './shade-calc'
export * from './shade-rest'

export default class ShadeSwap implements ICanSwap, ILivePoolStore {
  public name = 'shade' as DexProtocol
  constructor(public readonly rpcEndpoint: string) {
  }
  calculateSwapRoutesWithManyPools(amountIn: Amount, tokenInId: Token, tokenOutId: Token, pools: IPool[]): { route: IRoute; amountOut: Amount } {
    const startingToken = getShadeTokenBySymbol(tokenInId);
    const endingToken = getShadeTokenBySymbol(tokenOutId);
    const [route] = calculateBestShadeSwapRoutes({
      inputTokenAmount: BigNumber(amountIn.multipliedBy(10**startingToken.decimals)),
      startingTokenId: startingToken.id,
      endingTokenId: endingToken.id,
      isReverse: false,
      maxHops: 6,
    })
    return {
      route: route.route.map(r => ({
        ...(r as any)
      })),
      amountOut: convertCoinFromUDenomV2(route.quoteOutputAmount, endingToken.decimals)
    }
  }

  subscribeToPoolsUpdate(retryTime = 300): Observable<{ pools: IPool[]; height: number }> {
    return new Observable<{ pools: IPool[], height: number }>(observer => {
      createCosmosObserver(this.rpcEndpoint, retryTime).subscribe(blockHeight => getShadePairs()
        .then(shadePairs => observer.next({
          pools: shadePairs.map(sp => ({
            poolId: sp.name as PoolId,
            dex: 'shade',
            token0Id: toTokenId(sp.token0),
            token0Amount: BigNumber(sp.token0.amount),
            token1Id: toTokenId(sp.token1),
            token1Amount: BigNumber(sp.token1.amount),
          })), height: blockHeight,
        })).catch(console.error), console.error);
    });
  }

}
