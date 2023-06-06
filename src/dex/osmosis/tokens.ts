import { Denom, NoIBCToken, NonArbedToken, SwapToken, SwapTokenMap, Token } from '../types/dex-types';
import { Logger, makeIBCMinimalDenom } from '../../utils';
import { ChainInfos } from './chainInfos';
import { IBCAsset, IBCAssetInfos } from './ibcAssets';
import _ from 'lodash';

const logger = new Logger('OsmoTokens');

// TODO: export this logic for resolving correct currency to dexSDK to be used by shadbot
export const AXELAR_CURRENCY_OVERRIDES = {
  ETH: 'WETH'
};

const denomsToCoinInfo: Record<Denom, { chainId: string, token: Token | NonArbedToken }> = {};
const tokenToDenomInfo: Record<Token, { chainId: string, denom: Denom, channelId: string, decimals: number }> = {};
ChainInfos.forEach(chInfo => {
  chInfo.currencies.forEach(curr => {
    let parsedCoinDenom = curr.coinDenom.replace('-', '');
    parsedCoinDenom = chInfo.chainName === 'Axelar' ? AXELAR_CURRENCY_OVERRIDES[parsedCoinDenom] || parsedCoinDenom : parsedCoinDenom;
    if (parsedCoinDenom === 'OSMO') {
      tokenToDenomInfo[SwapToken.OSMO] = {
        chainId: chInfo.chainId,
        channelId: null,
        decimals: curr.coinDecimals,
        denom: curr.coinMinimalDenom as Denom
      }
      denomsToCoinInfo[curr.coinMinimalDenom] = {
        chainId: chInfo.chainId,
        token: SwapToken.OSMO,
      };
      return;
    }
    const ibcInfo: IBCAsset = _.find(IBCAssetInfos, {
      counterpartyChainId: chInfo.chainId,
      coinMinimalDenom: curr.coinMinimalDenom.includes(':') ? curr.coinMinimalDenom.split(':').slice(0, 2).join(':') : curr.coinMinimalDenom,
    });
    if (!ibcInfo) {
      tokenToDenomInfo[curr.coinDenom as NoIBCToken] = {
        chainId: chInfo.chainId,
        channelId: null,
        decimals: curr.coinDecimals,
        denom: curr.coinMinimalDenom as Denom
      }
      return denomsToCoinInfo[curr.coinMinimalDenom] = {
        chainId: chInfo.chainId,
        token: curr.coinDenom as NoIBCToken,
      };
    }
    const ibcMinimalDenom = makeIBCMinimalDenom(ibcInfo.sourceChannelId, ibcInfo.coinMinimalDenom);
    const swapToken = SwapToken[parsedCoinDenom];
    if (!swapToken) {
      tokenToDenomInfo[curr.coinMinimalDenom as NonArbedToken] = {
        chainId: chInfo.chainId,
        decimals: curr.coinDecimals,
        channelId: ibcInfo.sourceChannelId,
        denom: ibcMinimalDenom as string as Denom
      }
      return denomsToCoinInfo[ibcMinimalDenom] = {
        chainId: chInfo.chainId,
        token: curr.coinMinimalDenom as NonArbedToken,
      };
    } else {
      const swapTokenParsed: Token = SwapTokenMap[swapToken];
      if (!swapTokenParsed) {
        logger.debugOnce(`No swap token for denom=${parsedCoinDenom} on chain=${chInfo.chainId}/${chInfo.chainName}`);
      }
      if (typeof chInfo.chainId !== 'string') {
        logger.debugOnce(`No chainId for denom=${parsedCoinDenom} on chain=${chInfo.chainName}`);
      }
      tokenToDenomInfo[swapTokenParsed] = {
        decimals: curr.coinDecimals,
        chainId: chInfo.chainId,
        channelId: ibcInfo.sourceChannelId,
        denom: ibcMinimalDenom as string as Denom
      }
      return denomsToCoinInfo[ibcMinimalDenom] = {
        chainId: chInfo.chainId,
        token: swapTokenParsed,
      };
    }
  });
});

export function toTokenId(osmoDenom: Denom, pid?, poolTokenId?): Token | NonArbedToken {
  if (denomsToCoinInfo[osmoDenom]) {
    return denomsToCoinInfo[osmoDenom].token;
  } else {
    logger.debugOnce(`Not mapped OsmosisSwap poolId=${pid},${poolTokenId} (denom=${osmoDenom})`);
  }
}

export function getTokenDenom(token: Token): { denom: Denom, decimals: number} {
  const info = tokenToDenomInfo[token];
  if(!info) {
    throw new Error(`${token} denom/decimals info not found`)
  }
  return {
    ...info
  };
}
