import { Denom, NoIBCToken, NonArbedToken, SwapTokens, Token } from '../types/swap-types';
import { Logger, makeIBCMinimalDenom } from '../../utils';
import { ChainInfos } from './chainInfos';
import { IBCAsset, IBCAssetInfos } from './ibcAssets';
import _ from 'lodash';

const logger = new Logger('OsmoTokens');

const denomsToCoinInfo: Record<Denom, { chainId: string, token: Token | NonArbedToken }> = {};
ChainInfos.forEach(chInfo => {
  chInfo.currencies.forEach(curr => {
    const parsedCoinDenom = curr.coinDenom.replace('-', '');
    if (parsedCoinDenom === 'OSMO') {
      denomsToCoinInfo[curr.coinMinimalDenom] = {
        chainId: chInfo.chainId,
        token: SwapTokens.OSMO,
      };
      return;
    }
    const ibcInfo: IBCAsset = _.find(IBCAssetInfos, {
      counterpartyChainId: chInfo.chainId,
      coinMinimalDenom: curr.coinMinimalDenom.includes(':') ? curr.coinMinimalDenom.split(':').slice(0, 2).join(':') : curr.coinMinimalDenom,
    });
    if (!ibcInfo) {
      return denomsToCoinInfo[curr.coinMinimalDenom] = {
        chainId: chInfo.chainId,
        token: curr.coinDenom as NoIBCToken,
      };
    }
    const ibcMinimalDenom = makeIBCMinimalDenom(ibcInfo.sourceChannelId, ibcInfo.coinMinimalDenom);
    if (!SwapTokens[parsedCoinDenom]) {
      return denomsToCoinInfo[ibcMinimalDenom] = {
        chainId: chInfo.chainId,
        token: curr.coinMinimalDenom as NonArbedToken,
      };
    } else {
      const swapToken = SwapTokens[parsedCoinDenom];
      if (!swapToken) {
        logger.debugOnce(`No swap token for denom=${parsedCoinDenom} on chain=${chInfo.chainId}/${chInfo.chainName}`);
      }
      if (typeof chInfo.chainId !== 'string') {
        logger.debugOnce(`No chainId for denom=${parsedCoinDenom} on chain=${chInfo.chainName}`);
      }
      return denomsToCoinInfo[ibcMinimalDenom] = {
        chainId: chInfo.chainId,
        token: swapToken,
      };
    }
  });
});

export function toTokenId(osmoDenom: Denom, pid, poolTokenId): Token | NonArbedToken {
  if (denomsToCoinInfo[osmoDenom]) {
    return denomsToCoinInfo[osmoDenom].token;
  } else {
    logger.debugOnce(`Not mapped OsmosisSwap poolId=${pid},${poolTokenId} (denom=${osmoDenom})`);
  }
}
