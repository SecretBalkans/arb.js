/* tslint:disable */
import { AppCurrency, ChainInfo } from "@keplr-wallet/types";
import { Logger } from "../../utils";

const Bech32Address = {
  defaultBech32Config(str) {
    return str;
  },
};

// copied from osmosis frontend

const {
  IS_TESTNET,
  OSMOSIS_CHAIN_ID_OVERWRITE,
  OSMOSIS_CHAIN_NAME_OVERWRITE,
  OSMOSIS_EXPLORER_URL_OVERWRITE,
  OSMOSIS_REST_OVERWRITE,
  OSMOSIS_RPC_OVERWRITE,
} = {
  IS_TESTNET: false,
  OSMOSIS_CHAIN_ID_OVERWRITE: null,
  OSMOSIS_CHAIN_NAME_OVERWRITE: null,
  OSMOSIS_EXPLORER_URL_OVERWRITE: null,
  OSMOSIS_REST_OVERWRITE: null,
  OSMOSIS_RPC_OVERWRITE: null,
};

export type ChainCurrency = AppCurrency & {
  isStakeCurrency?: boolean,
  isFeeCurrency?: boolean,
  gasPriceStep?: {
    low: number,
    average: number,
    high: number
  }
};
/** All currency attributes (stake and fee) are defined once in the `currencies` list.
 *  Maintains the option to skip this conversion and keep the verbose `ChainInfo` type.
 */
export type SimplifiedChainInfo = Omit<
  ChainInfo,
  "stakeCurrency" | "feeCurrencies" | "bech32config"
> & {
  bech32Config: string,
  currencies: Array<
    ChainCurrency
  >;
};

const chainInfos = (
  [
    {
      rpc:
        OSMOSIS_RPC_OVERWRITE ??
        (IS_TESTNET
          ? "https://rpc.testnet.osmosis.zone/"
          : "https://osmosis-rpc.quickapi.com:443"),
      rest:
        OSMOSIS_REST_OVERWRITE ??
        (IS_TESTNET
          ? "https://lcd.testnet.osmosis.zone/"
          : "https://osmosis-mainnet-lcd.autostake.com:443"),
      chainId:
        OSMOSIS_CHAIN_ID_OVERWRITE ??
        (IS_TESTNET ? "osmo-test-4" : "osmosis-1"),
      chainName: OSMOSIS_CHAIN_NAME_OVERWRITE ?? "Osmosis",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("osmo"),
      currencies: [
        {
          coinDenom: "OSMO",
          coinMinimalDenom: "uosmo",
          coinDecimals: 6,
          coinGeckoId: "osmosis",
          // coinGeckoId: "pool:uosmo",
          coinImageUrl: "/tokens/osmo.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.0025,
            average: 0.025,
            high: 0.04,
          },
        },
        {
          coinDenom: "ION",
          coinMinimalDenom: "uion",
          coinDecimals: 6,
          coinGeckoId: "ion",
          // coinGeckoId: "pool:uion",
          coinImageUrl: "/tokens/ion.svg",
        },
        ...(IS_TESTNET
          ? [
            {
              coinDenom: "IBCX",
              coinMinimalDenom:
                "factory/osmo13t90mkyvdnmn9wm8hfen6jk3hnlt8uqx8savlvjd5xghy5z6ye2qymy6cy/uibcx",
              coinDecimals: 6,
              coinImageUrl: "/tokens/ibcx.svg",
            },
          ]
          : []),
      ],
      features: ["ibc-transfer", "ibc-go", "cosmwasm", "wasmd_0.24+"],
      explorerUrlToTx:
        OSMOSIS_EXPLORER_URL_OVERWRITE ??
        (IS_TESTNET
          ? "https://testnet.mintscan.io/osmosis-testnet/txs/{txHash}"
          : "https://www.mintscan.io/osmosis/txs/{txHash}"),
    },
    {
      rpc: "https://rpc.cosmoshub.strange.love",
      rest: "https://lcd.cosmos.dragonstake.io",
      chainId: "cosmoshub-4",
      chainName: "Cosmos Hub",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("cosmos"),
      currencies: [
        {
          coinDenom: "ATOM",
          coinMinimalDenom: "uatom",
          coinDecimals: 6,
          coinGeckoId: "cosmos",
          // coinGeckoId: "pool:uatom",
          coinImageUrl: "/tokens/atom.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.00875,
            average: 0.025,
            high: 0.03,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/cosmos/txs/{txHash}",
    },
    {
      rpc: "https://rpc-terra-ia.cosmosia.notional.ventures/",
      rest: "https://api-terra-ia.cosmosia.notional.ventures/",
      chainId: "columbus-5",
      chainName: "Terra Classic",
      bip44: {
        coinType: 330,
      },
      bech32Config: Bech32Address.defaultBech32Config("terra"),
      currencies: [
        {
          coinDenom: "LUNC",
          coinMinimalDenom: "uluna",
          coinDecimals: 6,
          coinGeckoId: "terra-luna",
          // coinGeckoId: "pool:ulunc",
          coinImageUrl: "/tokens/lunc.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 28.325,
            average: 28.325,
            high: 50,
          },
        },
        {
          coinDenom: "USTC",
          coinMinimalDenom: "uusd",
          coinDecimals: 6,
          coinGeckoId: "terrausd",
          // coinGeckoId: "pool:uustc",
          coinImageUrl: "/tokens/ust.svg",
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.75,
            average: 0.75,
            high: 0.75,
          },
          pegMechanism: "algorithmic",
        },
        {
          coinDenom: "KRTC",
          coinMinimalDenom: "ukrw",
          coinDecimals: 6,
          coinGeckoId: "terra-krw",
          coinImageUrl: "/tokens/krt.svg",
          pegMechanism: "algorithmic",
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://finder.terra.money/columbus-5/tx/{txHash}",
    },
    {
      rpc: "https://rpc.secret.express",
      rest: "https://lcd.secret.express",
      // rest: "https://lcd-secret.whispernode.com:443", // dead
      // rest: "https://api.scrt.network/",
      chainId: "secret-4",
      chainName: "Secret Network",
      bip44: {
        coinType: 529,
      },
      bech32Config: Bech32Address.defaultBech32Config("secret"),
      currencies: [
        {
          coinDenom: "SCRT",
          coinMinimalDenom: "uscrt",
          coinDecimals: 6,
          coinGeckoId: "secret",
          // coinGeckoId: "pool:uscrt",
          coinImageUrl: "/tokens/scrt.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.088,
            average: 0.1,
            high: 0.25,
          },
        },
        {
          type: "cw20",
          contractAddress: "secret12rcvz0umvk875kd6a803txhtlu7y0pnd73kcej",
          coinDenom: "ALTER",
          coinMinimalDenom:
            "cw20:secret12rcvz0umvk875kd6a803txhtlu7y0pnd73kcej:ALTER",
          coinDecimals: 6,
          coinGeckoId: "alter",
          // coinGeckoId: "pool:alter",
          coinImageUrl: "/tokens/alter.svg",
        },
        {
          type: "cw20",
          contractAddress: "secret1s09x2xvfd2lp2skgzm29w2xtena7s8fq98v852",
          coinDenom: "AMBER",
          coinMinimalDenom:
            "cw20:secret1s09x2xvfd2lp2skgzm29w2xtena7s8fq98v852:AMBER",
          coinDecimals: 6,
          // coinGeckoId: "amber",
          coinImageUrl: "/tokens/amber.svg",
        },
        {
          type: "cw20",
          contractAddress: "secret1yxcexylwyxlq58umhgsjgstgcg2a0ytfy4d9lt",
          coinDenom: "BUTT",
          coinMinimalDenom:
            "cw20:secret1yxcexylwyxlq58umhgsjgstgcg2a0ytfy4d9lt:BUTT",
          coinDecimals: 6,
          coinGeckoId: "button",
          coinImageUrl: "/tokens/butt.svg",
        },
        {
          type: "cw20",
          contractAddress: "secret1qfql357amn448duf5gvp9gr48sxx9tsnhupu3d",
          coinDenom: "SHD(old)",
          coinMinimalDenom:
            "cw20:secret1qfql357amn448duf5gvp9gr48sxx9tsnhupu3d:SHD",
          coinDecimals: 8,
          // coinGeckoId: "shade-protocol",
          // coinGeckoId: "pool:shdold",
          coinImageUrl: "/tokens/shdold.svg",
        },
        {
          type: "cw20",
          contractAddress: "secret153wu605vvp934xhd4k9dtd640zsep5jkesstdm",
          coinDenom: "SHD",
          coinMinimalDenom:
            "cw20:secret153wu605vvp934xhd4k9dtd640zsep5jkesstdm:SHD",
          coinDecimals: 8,
          coinGeckoId: "shade-protocol",
          // coinGeckoId: "pool:shd",
          coinImageUrl: "/tokens/shd.svg",
        },
        {
          type: "cw20",
          contractAddress: "secret1fl449muk5yq8dlad7a22nje4p5d2pnsgymhjfd",
          coinDenom: "SILK",
          coinMinimalDenom:
            "cw20:secret1fl449muk5yq8dlad7a22nje4p5d2pnsgymhjfd:SILK",
          coinDecimals: 6,
          coinGeckoId: "pool:silk",
          coinImageUrl: "/tokens/silk.svg",
        },
        {
          type: "cw20",
          contractAddress: "secret1k6u0cy4feepm6pehnz804zmwakuwdapm69tuc4",
          coinDenom: "stkdSCRT",
          coinMinimalDenom:
            "cw20:secret1k6u0cy4feepm6pehnz804zmwakuwdapm69tuc4:stkd-SCRT",
          coinDecimals: 6,
          coinGeckoId: "stkd-scrt",
          coinImageUrl: "/tokens/stkd-scrt.svg",
        },
        {
          type: "cw20",
          contractAddress: "secret1rgm2m5t530tdzyd99775n6vzumxa5luxcllml4",
          coinDenom: "SIENNA",
          coinMinimalDenom:
            "cw20:secret1rgm2m5t530tdzyd99775n6vzumxa5luxcllml4:SIENNA",
          coinDecimals: 18,
          coinGeckoId: "sienna",
          coinImageUrl: "/tokens/sienna.svg",
        },
      ],
      features: ["ibc-transfer", "ibc-go", "wasmd_0.24+", "cosmwasm"],
      explorerUrlToTx:
        "https://secretnodes.com/secret/chains/secret-4/transactions/{txHash}",
    },
    {
      rpc: "https://rpc-akash.keplr.app",
      rest: "https://lcd-akash.keplr.app",
      chainId: "akashnet-2",
      chainName: "Akash",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("akash"),
      currencies: [
        {
          coinDenom: "AKT",
          coinMinimalDenom: "uakt",
          coinDecimals: 6,
          coinGeckoId: "akash-network",
          // coinGeckoId: "pool:uakt",
          coinImageUrl: "/tokens/akt.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/akash/txs/{txHash}",
    },
    {
      rpc: "https://rpc-regen.keplr.app",
      rest: "https://lcd-regen.keplr.app",
      chainId: "regen-1",
      chainName: "Regen Network",
      bip44: { coinType: 118 },
      bech32Config: Bech32Address.defaultBech32Config("regen"),
      currencies: [
        {
          coinDenom: "REGEN",
          coinMinimalDenom: "uregen",
          coinDecimals: 6,
          coinImageUrl: "/tokens/regen.svg",
          coinGeckoId: "regen",
          // coinGeckoId: "pool:uregen",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.015,
            average: 0.025,
            high: 0.04,
          },
        },
        {
          coinDenom: "NCT",
          coinMinimalDenom: "eco.uC.NCT",
          coinDecimals: 6,
          coinImageUrl: "/tokens/nct.svg",
          coinGeckoId: "pool:nct",
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://regen.aneka.io/txs/{txHash}",
    },
    {
      rpc: "https://rpc-sentinel.keplr.app",
      rest: "https://lcd-sentinel.keplr.app",
      chainId: "sentinelhub-2",
      chainName: "Sentinel",
      bip44: { coinType: 118 },
      bech32Config: Bech32Address.defaultBech32Config("sent"),
      currencies: [
        {
          coinDenom: "DVPN",
          coinMinimalDenom: "udvpn",
          coinDecimals: 6,
          coinGeckoId: "sentinel",
          // coinGeckoId: "pool:udvpn",
          coinImageUrl: "/tokens/dvpn.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.1,
            average: 0.25,
            high: 0.4,
          },
        },
      ],
      explorerUrlToTx: "https://www.mintscan.io/sentinel/txs/{txHash}",
      features: ["ibc-transfer", "ibc-go"],
    },
    {
      rpc: "https://rpc.persistence.posthuman.digital:443",
      rest: "https://lcd-persistence.keplr.app",
      chainId: "core-1",
      chainName: "Persistence",
      bip44: {
        coinType: 750,
      },
      bech32Config: Bech32Address.defaultBech32Config("persistence"),
      currencies: [
        {
          coinDenom: "XPRT",
          coinMinimalDenom: "uxprt",
          coinDecimals: 6,
          coinGeckoId: "persistence",
          // coinGeckoId: "pool:uxprt",
          coinImageUrl: "/tokens/xprt.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0,
            average: 0,
            high: 0.04,
          },
        },
        {
          coinDenom: "PSTAKE",
          coinMinimalDenom:
            "ibc/A6E3AF63B3C906416A9AF7A556C59EA4BD50E617EFFE6299B99700CCB780E444",
          coinDecimals: 18,
          coinGeckoId: "pstake-finance",
          // coinGeckoId: "pool:pstake",
          coinImageUrl: "/tokens/pstake.svg",
        },
        {
          coinDenom: "stkATOM",
          coinMinimalDenom: "stk/uatom",
          coinDecimals: 6,
          coinGeckoId: "stkatom",
          // coinGeckoId: "pool:stk/uatom",
          coinImageUrl: "/tokens/stkatom.svg",
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/persistence/txs/{txHash}",
    },
    {
      rpc: "https://rpc-iris.keplr.app",
      rest: "https://lcd-iris.keplr.app",
      chainId: "irishub-1",
      chainName: "IRISnet",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("iaa"),
      currencies: [
        {
          coinDenom: "IRIS",
          coinMinimalDenom: "uiris",
          coinDecimals: 6,
          coinGeckoId: "iris-network",
          // coinGeckoId: "pool:uiris",
          coinImageUrl: "/tokens/iris.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.2,
            average: 0.3,
            high: 0.4,
          },
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://www.mintscan.io/iris/txs/{txHash}",
    },
    {
      rpc: "https://rpc-crypto-org.keplr.app/",
      rest: "https://lcd-crypto-org.keplr.app/",
      chainId: "crypto-org-chain-mainnet-1",
      chainName: "Crypto.org",
      bip44: {
        coinType: 394,
      },
      bech32Config: Bech32Address.defaultBech32Config("cro"),
      currencies: [
        {
          coinDenom: "CRO",
          coinMinimalDenom: "basecro",
          coinDecimals: 8,
          coinGeckoId: "crypto-com-chain",
          // coinGeckoId: "pool:basecro",
          coinImageUrl: "/tokens/cro.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.025,
            average: 0.03,
            high: 0.04,
          },
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://www.mintscan.io/crypto-org/txs/{txHash}",
    },
    {
      rpc: "https://rpc-iov.keplr.app",
      rest: "https://lcd-iov.keplr.app",
      chainId: "iov-mainnet-ibc",
      chainName: "Starname",
      bip44: {
        coinType: 234,
      },
      bech32Config: Bech32Address.defaultBech32Config("star"),
      currencies: [
        {
          coinDenom: "IOV",
          coinMinimalDenom: "uiov",
          coinDecimals: 6,
          coinGeckoId: "starname",
          // coinGeckoId: "pool:uiov",
          coinImageUrl: "/tokens/iov.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 1,
            average: 2,
            high: 3,
          },
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://www.mintscan.io/starname/txs/{txHash}",
    },
    {
      rpc: "https://rpc-emoney.keplr.app",
      rest: "https://lcd-emoney.keplr.app",
      chainId: "emoney-3",
      chainName: "e-Money",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("emoney"),
      currencies: [
        {
          coinDenom: "NGM",
          coinMinimalDenom: "ungm",
          coinDecimals: 6,
          coinGeckoId: "e-money",
          // coinGeckoId: "pool:ungm",
          coinImageUrl: "/tokens/ngm.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 1,
            average: 1,
            high: 1,
          },
        },
        {
          coinDenom: "EEUR",
          coinMinimalDenom: "eeur",
          coinDecimals: 6,
          coinGeckoId: "e-money-eur",
          // coinGeckoId: "pool:eeur",
          coinImageUrl: "/tokens/eeur.svg",
          isFeeCurrency: true,
          gasPriceStep: {
            low: 1,
            average: 1,
            high: 1,
          },
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://emoney.bigdipper.live/transactions/{txHash}",
    },
    {
      rpc: IS_TESTNET
        ? "https://rpc.uni.junonetwork.io"
        : "https://rpc-juno.ecostake.com",
      rest: IS_TESTNET
        ? "https://api.uni.junonetwork.io"
        : "https://lcd-juno.itastakers.com",
      chainId: IS_TESTNET ? "uni-6" : "juno-1",
      chainName: IS_TESTNET ? "Juno Testnet" : "Juno",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("juno"),
      currencies: [
        {
          coinDenom: IS_TESTNET ? "JUNOX" : "JUNO",
          coinMinimalDenom: IS_TESTNET ? "ujunox" : "ujuno",
          coinDecimals: 6,
          coinGeckoId: "juno-network",
          // coinGeckoId: "pool:ujuno",
          coinImageUrl: "/tokens/juno.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: IS_TESTNET
            ? {
              low: 0.001,
              average: 0.0025,
              high: 0.004,
            }
            : {
              low: 0.03,
              average: 0.04,
              high: 0.05,
            },
        },
        {
          type: "cw20",
          contractAddress:
            "juno168ctmpyppk90d34p3jjy658zf5a5l3w8wk35wht6ccqj4mr0yv8s4j5awr",
          coinDenom: "NETA",
          coinMinimalDenom:
            "cw20:juno168ctmpyppk90d34p3jjy658zf5a5l3w8wk35wht6ccqj4mr0yv8s4j5awr:NETA",
          coinDecimals: 6,
          coinGeckoId: "neta",
          // coinGeckoId: "pool:neta",
          coinImageUrl: "/tokens/neta.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1g2g7ucurum66d42g8k5twk34yegdq8c82858gz0tq2fc75zy7khssgnhjl",
          coinDenom: "MARBLE",
          coinMinimalDenom:
            "cw20:juno1g2g7ucurum66d42g8k5twk34yegdq8c82858gz0tq2fc75zy7khssgnhjl:MARBLE",
          coinDecimals: 3,
          coinGeckoId: "marble",
          // coinGeckoId: "pool:marble",
          coinImageUrl: "/tokens/marble.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1re3x67ppxap48ygndmrc7har2cnc7tcxtm9nplcas4v0gc3wnmvs3s807z",
          coinDenom: "HOPE",
          coinMinimalDenom:
            "cw20:juno1re3x67ppxap48ygndmrc7har2cnc7tcxtm9nplcas4v0gc3wnmvs3s807z:HOPE",
          coinDecimals: 6,
          // coinGecko: "hope-galaxy",
          coinGeckoId: "pool:hope",
          coinImageUrl: "/tokens/hope.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1r4pzw8f9z0sypct5l9j906d47z998ulwvhvqe5xdwgy8wf84583sxwh0pa",
          coinDenom: "RAC",
          coinMinimalDenom:
            "cw20:juno1r4pzw8f9z0sypct5l9j906d47z998ulwvhvqe5xdwgy8wf84583sxwh0pa:RAC",
          coinDecimals: 6,
          // coinGeckoId: "racoon",
          coinGeckoId: "pool:rac",
          coinImageUrl: "/tokens/rac.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1y9rf7ql6ffwkv02hsgd4yruz23pn4w97p75e2slsnkm0mnamhzysvqnxaq",
          coinDenom: "BLOCK",
          coinMinimalDenom:
            "cw20:juno1y9rf7ql6ffwkv02hsgd4yruz23pn4w97p75e2slsnkm0mnamhzysvqnxaq:BLOCK",
          coinDecimals: 6,
          //coinGeckoId: "pool:block",
          coinImageUrl: "/tokens/block.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1tdjwrqmnztn2j3sj2ln9xnyps5hs48q3ddwjrz7jpv6mskappjys5czd49",
          coinDenom: "DHK",
          coinMinimalDenom:
            "cw20:juno1tdjwrqmnztn2j3sj2ln9xnyps5hs48q3ddwjrz7jpv6mskappjys5czd49:DHK",
          coinDecimals: 0,
          coinGeckoId: "pool:dhk",
          coinImageUrl: "/tokens/dhk.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno15u3dt79t6sxxa3x3kpkhzsy56edaa5a66wvt3kxmukqjz2sx0hes5sn38g",
          coinDenom: "RAW",
          coinMinimalDenom:
            "cw20:juno15u3dt79t6sxxa3x3kpkhzsy56edaa5a66wvt3kxmukqjz2sx0hes5sn38g:RAW",
          coinDecimals: 6,
          // coinGeckoId: "junoswap-raw-dao",
          coinGeckoId: "pool:raw",
          coinImageUrl: "/tokens/raw.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno17wzaxtfdw5em7lc94yed4ylgjme63eh73lm3lutp2rhcxttyvpwsypjm4w",
          coinDenom: "ASVT",
          coinMinimalDenom:
            "cw20:juno17wzaxtfdw5em7lc94yed4ylgjme63eh73lm3lutp2rhcxttyvpwsypjm4w:ASVT",
          coinDecimals: 6,
          coinGeckoId: "pool:asvt",
          coinImageUrl: "/tokens/asvt.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1n7n7d5088qlzlj37e9mgmkhx6dfgtvt02hqxq66lcap4dxnzdhwqfmgng3",
          coinDenom: "JOE",
          coinMinimalDenom:
            "cw20:juno1n7n7d5088qlzlj37e9mgmkhx6dfgtvt02hqxq66lcap4dxnzdhwqfmgng3:JOE",
          coinDecimals: 6,
          coinGeckoId: "pool:joe",
          coinImageUrl: "/tokens/joe.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1j0a9ymgngasfn3l5me8qpd53l5zlm9wurfdk7r65s5mg6tkxal3qpgf5se",
          coinDenom: "GLTO",
          coinMinimalDenom:
            "cw20:juno1j0a9ymgngasfn3l5me8qpd53l5zlm9wurfdk7r65s5mg6tkxal3qpgf5se:GLTO",
          coinDecimals: 6,
          coinGeckoId: "pool:glto",
          coinImageUrl: "/tokens/glto.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1gz8cf86zr4vw9cjcyyv432vgdaecvr9n254d3uwwkx9rermekddsxzageh",
          coinDenom: "GKEY",
          coinMinimalDenom:
            "cw20:juno1gz8cf86zr4vw9cjcyyv432vgdaecvr9n254d3uwwkx9rermekddsxzageh:GKEY",
          coinDecimals: 6,
          coinGeckoId: "pool:gkey",
          coinImageUrl: "/tokens/gkey.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1dd0k0um5rqncfueza62w9sentdfh3ec4nw4aq4lk5hkjl63vljqscth9gv",
          coinDenom: "seJUNO",
          coinMinimalDenom:
            "cw20:juno1dd0k0um5rqncfueza62w9sentdfh3ec4nw4aq4lk5hkjl63vljqscth9gv:seJUNO",
          coinDecimals: 6,
          // coinGeckoId: "stakeeasy-juno-derivative",
          coinGeckoId: "pool:sejuno",
          coinImageUrl: "/tokens/sejuno.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1wwnhkagvcd3tjz6f8vsdsw5plqnw8qy2aj3rrhqr2axvktzv9q2qz8jxn3",
          coinDenom: "bJUNO",
          coinMinimalDenom:
            "cw20:juno1wwnhkagvcd3tjz6f8vsdsw5plqnw8qy2aj3rrhqr2axvktzv9q2qz8jxn3:bJUNO",
          coinDecimals: 6,
          coinImageUrl: "/tokens/bjuno.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno159q8t5g02744lxq8lfmcn6f78qqulq9wn3y9w7lxjgkz4e0a6kvsfvapse",
          coinDenom: "SOLAR",
          coinMinimalDenom:
            "cw20:juno159q8t5g02744lxq8lfmcn6f78qqulq9wn3y9w7lxjgkz4e0a6kvsfvapse:SOLAR",
          coinDecimals: 6,
          coinGeckoId: "pool:solar",
          coinImageUrl: "/tokens/solar.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno19rqljkh95gh40s7qdx40ksx3zq5tm4qsmsrdz9smw668x9zdr3lqtg33mf",
          coinDenom: "SEASY",
          coinMinimalDenom:
            "cw20:juno19rqljkh95gh40s7qdx40ksx3zq5tm4qsmsrdz9smw668x9zdr3lqtg33mf:SEASY",
          coinDecimals: 6,
          // coinGeckoId: "seasy",
          coinGeckoId: "pool:seasy",
          coinImageUrl: "/tokens/seasy.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1p8x807f6h222ur0vssqy3qk6mcpa40gw2pchquz5atl935t7kvyq894ne3",
          coinDenom: "MUSE",
          coinMinimalDenom:
            "cw20:juno1p8x807f6h222ur0vssqy3qk6mcpa40gw2pchquz5atl935t7kvyq894ne3:MUSE",
          coinDecimals: 6,
          //coinGeckoId: "pool:muse",
          coinImageUrl: "/tokens/muse.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1cltgm8v842gu54srmejewghnd6uqa26lzkpa635wzra9m9xuudkqa2gtcz",
          coinDenom: "FURY",
          coinMinimalDenom:
            "cw20:juno1cltgm8v842gu54srmejewghnd6uqa26lzkpa635wzra9m9xuudkqa2gtcz:FURY",
          coinDecimals: 6,
          coinGeckoId: "fanfury",
          coinImageUrl: "/tokens/fanfury.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1rws84uz7969aaa7pej303udhlkt3j9ca0l3egpcae98jwak9quzq8szn2l",
          coinDenom: "PHMN",
          coinMinimalDenom:
            "cw20:juno1rws84uz7969aaa7pej303udhlkt3j9ca0l3egpcae98jwak9quzq8szn2l:PHMN",
          coinDecimals: 6,
          //coinGeckoId: "posthuman",
          coinGeckoId: "pool:phmn",
          coinImageUrl: "/tokens/phmn.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1u45shlp0q4gcckvsj06ss4xuvsu0z24a0d0vr9ce6r24pht4e5xq7q995n",
          coinDenom: "HOPERS",
          coinMinimalDenom:
            "cw20:juno1u45shlp0q4gcckvsj06ss4xuvsu0z24a0d0vr9ce6r24pht4e5xq7q995n:HOPERS",
          coinDecimals: 6,
          coinGeckoId: "pool:hopers",
          coinImageUrl: "/tokens/hopers.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1mkw83sv6c7sjdvsaplrzc8yaes9l42p4mhy0ssuxjnyzl87c9eps7ce3m9",
          coinDenom: "WYND",
          coinMinimalDenom:
            "cw20:juno1mkw83sv6c7sjdvsaplrzc8yaes9l42p4mhy0ssuxjnyzl87c9eps7ce3m9:WYND",
          coinDecimals: 6,
          coinGeckoId: "pool:wynd",
          coinImageUrl: "/tokens/wynd.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1qmlchtmjpvu0cr7u0tad2pq8838h6farrrjzp39eqa9xswg7teussrswlq",
          coinDenom: "NRIDE",
          coinMinimalDenom:
            "cw20:juno1qmlchtmjpvu0cr7u0tad2pq8838h6farrrjzp39eqa9xswg7teussrswlq:NRIDE",
          coinDecimals: 6,
          coinGeckoId: "pool:nride",
          coinImageUrl: "/tokens/nride.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1u8cr3hcjvfkzxcaacv9q75uw9hwjmn8pucc93pmy6yvkzz79kh3qncca8x",
          coinDenom: "FOX",
          coinMinimalDenom:
            "cw20:juno1u8cr3hcjvfkzxcaacv9q75uw9hwjmn8pucc93pmy6yvkzz79kh3qncca8x:FOX",
          coinDecimals: 6,
          coinGeckoId: "pool:fox",
          coinImageUrl: "/tokens/fox.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1xekkh27punj0uxruv3gvuydyt856fax0nu750xns99t2qcxp7xmsqwhfma",
          coinDenom: "GRDN",
          coinMinimalDenom:
            "cw20:juno1xekkh27punj0uxruv3gvuydyt856fax0nu750xns99t2qcxp7xmsqwhfma:GRDN",
          coinDecimals: 6,
          coinGeckoId: "pool:grdn",
          coinImageUrl: "/tokens/guardian.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno166heaxlyntd33a5euh4rrz26svhean4klzw594esmd02l4atan6sazy2my",
          coinDenom: "MNPU",
          coinMinimalDenom:
            "cw20:juno166heaxlyntd33a5euh4rrz26svhean4klzw594esmd02l4atan6sazy2my:MNPU",
          coinDecimals: 6,
          coinGeckoId: "pool:mnpu",
          coinImageUrl: "/tokens/mnpu.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1x5qt47rw84c4k6xvvywtrd40p8gxjt8wnmlahlqg07qevah3f8lqwxfs7z",
          coinDenom: "SHIBAC",
          coinMinimalDenom:
            "cw20:juno1x5qt47rw84c4k6xvvywtrd40p8gxjt8wnmlahlqg07qevah3f8lqwxfs7z:SHIBAC",
          coinDecimals: 6,
          coinGeckoId: "pool:shibac",
          coinImageUrl: "/tokens/shibacosmos.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1qqwf3lkfjhp77yja7gmg3y95pda0e5xctqrdhf3wvwdd79flagvqfgrgxp",
          coinDenom: "SKOJ",
          coinMinimalDenom:
            "cw20:juno1qqwf3lkfjhp77yja7gmg3y95pda0e5xctqrdhf3wvwdd79flagvqfgrgxp:SKOJ",
          coinDecimals: 6,
          coinGeckoId: "pool:skoj",
          coinImageUrl: "/tokens/sikoba.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1ngww7zxak55fql42wmyqrr4rhzpne24hhs4p3w4cwhcdgqgr3hxsmzl9zg",
          coinDenom: "CLST",
          coinMinimalDenom:
            "cw20:juno1ngww7zxak55fql42wmyqrr4rhzpne24hhs4p3w4cwhcdgqgr3hxsmzl9zg:CLST",
          coinDecimals: 6,
          coinGeckoId: "pool:clst",
          coinImageUrl: "/tokens/celestims.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1ytymtllllsp3hfmndvcp802p2xmy5s8m59ufel8xv9ahyxyfs4hs4kd4je",
          coinDenom: "OSDOGE",
          coinMinimalDenom:
            "cw20:juno1ytymtllllsp3hfmndvcp802p2xmy5s8m59ufel8xv9ahyxyfs4hs4kd4je:OSDOGE",
          coinDecimals: 6,
          coinGeckoId: "pool:osdoge",
          coinImageUrl: "/tokens/osdoge.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1jrr0tuuzxrrwcg6hgeqhw5wqpck2y55734e7zcrp745aardlp0qqg8jz06",
          coinDenom: "APEMOS",
          coinMinimalDenom:
            "cw20:juno1jrr0tuuzxrrwcg6hgeqhw5wqpck2y55734e7zcrp745aardlp0qqg8jz06:APEMOS",
          coinDecimals: 6,
          coinGeckoId: "pool:apemos",
          coinImageUrl: "/tokens/apemos.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1jwdy7v4egw36pd84aeks3ww6n8k7zhsumd4ac8q5lts83ppxueus4626e8",
          coinDenom: "INVDRS",
          coinMinimalDenom:
            "cw20:juno1jwdy7v4egw36pd84aeks3ww6n8k7zhsumd4ac8q5lts83ppxueus4626e8:INVDRS",
          coinDecimals: 6,
          coinGeckoId: "pool:invdrs",
          coinImageUrl: "/tokens/invdrs.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1k2ruzzvvwwtwny6gq6kcwyfhkzahaunp685wmz4hafplduekj98q9hgs6d",
          coinDenom: "DOGA",
          coinMinimalDenom:
            "cw20:juno1k2ruzzvvwwtwny6gq6kcwyfhkzahaunp685wmz4hafplduekj98q9hgs6d:DOGA",
          coinDecimals: 6,
          coinGeckoId: "pool:doga",
          coinImageUrl: "/tokens/doga.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1zqrj3ta4u7ylv0wqzd8t8q3jrr9rdmn43zuzp9zemeunecnhy8fss778g7",
          coinDenom: "PEPE",
          coinMinimalDenom:
            "cw20:juno1zqrj3ta4u7ylv0wqzd8t8q3jrr9rdmn43zuzp9zemeunecnhy8fss778g7:PEPE",
          coinDecimals: 6,
          coinGeckoId: "pool:pepe",
          coinImageUrl: "/tokens/pepe.svg",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1f5datjdse3mdgrapwuzs3prl7pvxxht48ns6calnn0t77v2s9l8s0qu488",
          coinDenom: "CATMOS",
          coinMinimalDenom:
            "cw20:juno1f5datjdse3mdgrapwuzs3prl7pvxxht48ns6calnn0t77v2s9l8s0qu488:CATMOS",
          coinDecimals: 6,
          coinGeckoId: "pool:catmos",
          coinImageUrl: "/tokens/catmos.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1j4ux0f6gt7e82z7jdpm25v4g2gts880ap64rdwa49989wzhd0dfqed6vqm",
          coinDenom: "SUMMIT",
          coinMinimalDenom:
            "cw20:juno1j4ux0f6gt7e82z7jdpm25v4g2gts880ap64rdwa49989wzhd0dfqed6vqm:SUMMIT",
          coinDecimals: 6,
          coinGeckoId: "pool:summit",
          coinImageUrl: "/tokens/summit.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1dyyf7pxeassxvftf570krv7fdf5r8e4r04mp99h0mllsqzp3rs4q7y8yqg",
          coinDenom: "SPACER",
          coinMinimalDenom:
            "cw20:juno1dyyf7pxeassxvftf570krv7fdf5r8e4r04mp99h0mllsqzp3rs4q7y8yqg:SPACER",
          coinDecimals: 6,
          coinGeckoId: "pool:spacer",
          coinImageUrl: "/tokens/spacer.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1dpany8c0lj526lsa02sldv7shzvnw5dt5ues72rk35hd69rrydxqeraz8l",
          coinDenom: "LIGHT",
          coinMinimalDenom:
            "cw20:juno1dpany8c0lj526lsa02sldv7shzvnw5dt5ues72rk35hd69rrydxqeraz8l:LIGHT",
          coinDecimals: 6,
          coinGeckoId: "pool:light",
          coinImageUrl: "/tokens/light.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1llg7q2d5dqlrqzh5dxv8c7kzzjszld34s5vktqmlmaaxqjssz43sxyhq0d",
          coinDenom: "MILE",
          coinMinimalDenom:
            "cw20:juno1llg7q2d5dqlrqzh5dxv8c7kzzjszld34s5vktqmlmaaxqjssz43sxyhq0d:MILE",
          coinDecimals: 6,
          coinGeckoId: "pool:mile",
          coinImageUrl: "/tokens/mille.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno13ca2g36ng6etcfhr9qxx352uw2n5e92np54thfkm3w3nzlhsgvwsjaqlyq",
          coinDenom: "MANNA",
          coinMinimalDenom:
            "cw20:juno13ca2g36ng6etcfhr9qxx352uw2n5e92np54thfkm3w3nzlhsgvwsjaqlyq:MANNA",
          coinDecimals: 6,
          coinGeckoId: "pool:manna",
          coinImageUrl: "/tokens/manna.png",
        },
        {
          type: "cw20",
          contractAddress:
            "juno1lpvx3mv2a6ddzfjc7zzz2v2cm5gqgqf0hx67hc5p5qwn7hz4cdjsnznhu8",
          coinDenom: "VOID",
          coinMinimalDenom:
            "cw20:juno1lpvx3mv2a6ddzfjc7zzz2v2cm5gqgqf0hx67hc5p5qwn7hz4cdjsnznhu8:VOID",
          coinDecimals: 6,
          coinGeckoId: "pool:void",
          coinImageUrl: "/tokens/void.png",
        },
      ],
      features: ["ibc-transfer", "ibc-go", "wasmd_0.24+", "cosmwasm"],
      explorerUrlToTx: IS_TESTNET
        ? "https://testnet.mintscan.io/juno-testnet/txs/{txHash}"
        : "https://www.mintscan.io/juno/txs/{txHash}",
    },
    {
      rpc: "https://rpc-microtick.keplr.app",
      rest: "https://lcd-microtick.keplr.app",
      chainId: "microtick-1",
      chainName: "Microtick",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("micro"),
      currencies: [
        {
          coinDenom: "TICK",
          coinMinimalDenom: "utick",
          coinDecimals: 6,
          // coinGeckoId: "microtick",
          coinGeckoId: "pool:utick",
          coinImageUrl: "/tokens/tick.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://explorer.microtick.zone/transactions/{txHash}",
    },
    {
      rpc: "https://mainnet-node.like.co/rpc",
      rest: "https://mainnet-node.like.co",
      chainId: "likecoin-mainnet-2",
      chainName: "LikeCoin",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("like"),
      currencies: [
        {
          coinDenom: "LIKE",
          coinMinimalDenom: "nanolike",
          coinDecimals: 9,
          // coinGeckoId: "likecoin",
          coinGeckoId: "pool:nanolike",
          coinImageUrl: "/tokens/like.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 1,
            average: 10,
            high: 1000,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://likecoin.bigdipper.live/transactions/{txHash}",
    },
    {
      rpc: "https://rpc-impacthub.keplr.app",
      rest: "https://lcd-impacthub.keplr.app",
      chainId: "ixo-5",
      chainName: "IXO",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("ixo"),
      currencies: [
        {
          coinDenom: "IXO",
          coinMinimalDenom: "uixo",
          coinDecimals: 6,
          // coinGeckoId: "ixo",
          coinGeckoId: "pool:uixo",
          coinImageUrl: "/tokens/ixo.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.015,
            average: 0.025,
            high: 0.04,
          },
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://blockscan.ixo.world/txs/{txHash}",
    },
    {
      rpc: "https://rpc.bitcanna.io",
      rest: "https://lcd.bitcanna.io",
      chainId: "bitcanna-1",
      chainName: "BitCanna",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("bcna"),
      currencies: [
        {
          coinDenom: "BCNA",
          coinMinimalDenom: "ubcna",
          coinDecimals: 6,
          // coinGeckoId: "bitcanna",
          coinGeckoId: "pool:ubcna",
          coinImageUrl: "/tokens/bcna.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.001,
            average: 0.0025,
            high: 0.01,
          },
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://www.mintscan.io/bitcanna/txs/{txHash}",
    },
    {
      rpc: "https://rpc.explorebitsong.com",
      rest: "https://lcd.explorebitsong.com",
      chainId: "bitsong-2b",
      chainName: "BitSong",
      bip44: {
        coinType: 639,
      },
      bech32Config: Bech32Address.defaultBech32Config("bitsong"),
      currencies: [
        {
          coinDenom: "BTSG",
          coinMinimalDenom: "ubtsg",
          coinDecimals: 6,
          // coinGeckoId: "bitsong",
          coinGeckoId: "pool:ubtsg",
          coinImageUrl: "/tokens/btsg.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 3,
            average: 10,
            high: 20,
          },
        },
        {
          coinDenom: "CLAY",
          coinMinimalDenom: "ft2D8E7041556CE93E1EFD66C07C45D551A6AAAE09",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ft2D8E7041556CE93E1EFD66C07C45D551A6AAAE09.png",
        },
        {
          coinDenom: "FASANO",
          coinMinimalDenom: "ft25B30C386CDDEBD1413D5AE1180956AE9EB3B9F7",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ft25B30C386CDDEBD1413D5AE1180956AE9EB3B9F7.png",
        },
        {
          coinDenom: "D9X",
          coinMinimalDenom: "ft575B10B0CEE2C164D9ED6A96313496F164A9607C",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ft575B10B0CEE2C164D9ED6A96313496F164A9607C.png",
        },
        {
          coinDenom: "FONTI",
          coinMinimalDenom: "ft56664FC98A2CF5F4FBAC3566D1A11D891AD88305",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ft56664FC98A2CF5F4FBAC3566D1A11D891AD88305.png",
        },
        {
          coinDenom: "BJKS",
          coinMinimalDenom: "ft52EEB0EE509AC546ED92EAC8591F731F213DDD16",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ft52EEB0EE509AC546ED92EAC8591F731F213DDD16.png",
        },
        {
          coinDenom: "RWNE",
          coinMinimalDenom: "ftE4903ECC861CA45F2C2BC7EAB8255D2E6E87A33A",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ftE4903ECC861CA45F2C2BC7EAB8255D2E6E87A33A.png",
        },
        {
          coinDenom: "ENMODA",
          coinMinimalDenom: "ft85AE1716C5E39EA6D64BBD7898C3899A7B500626",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ft85AE1716C5E39EA6D64BBD7898C3899A7B500626.png",
        },
        {
          coinDenom: "404DR",
          coinMinimalDenom: "ft99091610CCC66F4277C66D14AF2BC4C5EE52E27A",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ft99091610CCC66F4277C66D14AF2BC4C5EE52E27A.png",
        },
        {
          coinDenom: "N43",
          coinMinimalDenom: "ft387C1C279D962ED80C09C1D592A92C4275FD7C5D",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ft387C1C279D962ED80C09C1D592A92C4275FD7C5D.png",
        },
        {
          coinDenom: "LOBO",
          coinMinimalDenom: "ft24C9FA4F10B0F235F4A815B15FC774E046A2B2EB",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ft24C9FA4F10B0F235F4A815B15FC774E046A2B2EB.png",
        },
        {
          coinDenom: "VIBRA",
          coinMinimalDenom: "ft7020C2A8E984EEBCBB383E91CD6FBB067BB2272B",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ft7020C2A8E984EEBCBB383E91CD6FBB067BB2272B.png",
        },
        {
          coinDenom: "KARINA",
          coinMinimalDenom: "ft2DD67F5D99E9A141142B48474FA7B6B3FF00A3FE",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ft2DD67F5D99E9A141142B48474FA7B6B3FF00A3FE.png",
        },
        {
          coinDenom: "TESTA",
          coinMinimalDenom: "ft4B030260D99E3ABE2B604EA2B33BAF3C085CDA12",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ft4B030260D99E3ABE2B604EA2B33BAF3C085CDA12.png",
        },
        {
          coinDenom: "CMQZ",
          coinMinimalDenom: "ftD4B6290EDEE1EC7B97AB5A1DC6C177EFD08ADCC3",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ftD4B6290EDEE1EC7B97AB5A1DC6C177EFD08ADCC3.png",
        },
        {
          coinDenom: "LDON",
          coinMinimalDenom: "ft347B1612A2B7659913679CF6CD45B8B130C50A00",
          coinDecimals: 6,
          coinImageUrl:
            "/tokens/ft347B1612A2B7659913679CF6CD45B8B130C50A00.png",
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://explorebitsong.com/transactions/{txHash}",
    },
    {
      rpc: "https://rpc-mainnet.blockchain.ki",
      rest: "https://api-mainnet.blockchain.ki",
      chainId: "kichain-2",
      chainName: "Ki",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("ki"),
      currencies: [
        {
          coinDenom: "XKI",
          coinMinimalDenom: "uxki",
          coinDecimals: 6,
          // coinGeckoId: "ki",
          coinGeckoId: "pool:uxki",
          coinImageUrl: "/tokens/xki.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.025,
            average: 0.03,
            high: 0.05,
          },
        },
        {
          type: "cw20",
          contractAddress:
            "ki1dt3lk455ed360pna38fkhqn0p8y44qndsr77qu73ghyaz2zv4whq83mwdy",
          coinDenom: "LVN",
          coinMinimalDenom:
            "cw20:ki1dt3lk455ed360pna38fkhqn0p8y44qndsr77qu73ghyaz2zv4whq83mwdy:LVN",
          coinDecimals: 6,
          coinGeckoId: "pool:lvn",
          coinImageUrl: "/tokens/lvn.png",
        },
      ],
      features: ["ibc-transfer", "ibc-go", "wasmd_0.24+", "cosmwasm"],
      explorerUrlToTx: "https://www.mintscan.io/ki-chain/txs/{txHash}",
    },
    {
      rpc: "https://rpc.gopanacea.org",
      rest: "https://api.gopanacea.org",
      chainId: "panacea-3",
      chainName: "MediBloc",
      bip44: {
        coinType: 371,
      },
      bech32Config: Bech32Address.defaultBech32Config("panacea"),
      currencies: [
        {
          coinDenom: "MED",
          coinMinimalDenom: "umed",
          coinDecimals: 6,
          // coinGeckoId: "medibloc",
          coinGeckoId: "pool:umed",
          coinImageUrl: "/tokens/med.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 5,
            average: 7,
            high: 9,
          },
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://www.mintscan.io/medibloc/txs/{txHash}",
    },
    {
      rpc: "https://rpc.bostrom.cybernode.ai",
      rest: "https://lcd.bostrom.cybernode.ai",
      chainId: "bostrom",
      chainName: "Bostrom",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("bostrom"),
      currencies: [
        {
          coinDenom: "BOOT",
          coinMinimalDenom: "boot",
          coinDecimals: 0,
          // coinGeckoId: "bostrom",
          coinGeckoId: "pool:boot",
          coinImageUrl: "/tokens/boot.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0,
            average: 0,
            high: 0.01,
          },
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://cyb.ai/network/bostrom/tx/{txHash}",
    },
    {
      rpc: "https://rpc-comdex.carbonZERO.zone:443",
      rest: "https://rest.comdex.one",
      chainId: "comdex-1",
      chainName: "Comdex",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("comdex"),
      currencies: [
        {
          coinDenom: "CMDX",
          coinMinimalDenom: "ucmdx",
          coinDecimals: 6,
          coinGeckoId: "comdex",
          // coinGeckoId: "pool:ucmdx",
          coinImageUrl: "/tokens/cmdx.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0,
            average: 0.025,
            high: 0.04,
          },
        },
        {
          coinDenom: "CMST",
          coinMinimalDenom: "ucmst",
          coinDecimals: 6,
          coinGeckoId: "composite",
          coinImageUrl: "/tokens/cmst.svg",
          pegMechanism: "collateralized",
        },
        {
          coinDenom: "HARBOR",
          coinMinimalDenom: "uharbor",
          coinDecimals: 6,
          coinGeckoId: "pool:uharbor",
          coinImageUrl: "/tokens/harbor.svg",
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://www.mintscan.io/comdex/txs/{txHash}",
    },
    {
      rpc: "https://rpc.cheqd.net",
      rest: "https://api.cheqd.net",
      chainId: "cheqd-mainnet-1",
      chainName: "cheqd",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("cheqd"),
      currencies: [
        {
          coinDenom: "CHEQ",
          coinMinimalDenom: "ncheq",
          coinDecimals: 9,
          // coinGeckoId: "cheqd-network",
          coinGeckoId: "pool:ncheq",
          coinImageUrl: "/tokens/cheq.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 25,
            average: 50,
            high: 100,
          },
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://explorer.cheqd.io/transactions/{txHash}",
    },
    {
      rpc: "https://rpc.stargaze-apis.com",
      rest: "https://rest.stargaze-apis.com",
      chainId: "stargaze-1",
      chainName: "Stargaze",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("stars"),
      currencies: [
        {
          coinDenom: "STARS",
          coinMinimalDenom: "ustars",
          coinDecimals: 6,
          coinGeckoId: "stargaze",
          // coinGeckoId: "pool:ustars",
          coinImageUrl: "/tokens/stars.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://www.mintscan.io/stargaze/txs/{txHash}",
    },
    {
      rpc: "https://rpc.chihuahua.wtf",
      rest: "https://api.chihuahua.wtf",
      chainId: "chihuahua-1",
      chainName: "Chihuahua",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("chihuahua"),
      currencies: [
        {
          coinDenom: "HUAHUA",
          coinMinimalDenom: "uhuahua",
          coinDecimals: 6,
          coinGeckoId: "chihuahua-token",
          // coinGeckoId: "pool:uhuahua",
          coinImageUrl: "/tokens/huahua.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 1.0,
            average: 5.0,
            high: 10.0,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://ping.pub/chihuahua/tx/{txHash}",
    },
    {
      rpc: "https://node0.mainnet.lum.network/rpc",
      rest: "https://node0.mainnet.lum.network/rest",
      chainId: "lum-network-1",
      chainName: "Lum Network",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("lum"),
      currencies: [
        {
          coinDenom: "LUM",
          coinMinimalDenom: "ulum",
          coinDecimals: 6,
          coinGeckoId: "lum-network",
          // coinGeckoId: "pool:ulum",
          coinImageUrl: "/tokens/lum.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.01,
            average: 0.025,
            high: 0.04,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/lum/txs/{txHash}",
    },
    {
      rpc: "https://mainnet-rpc.vidulum.app",
      rest: "https://mainnet-lcd.vidulum.app",
      chainId: "vidulum-1",
      chainName: "Vidulum",
      bip44: {
        coinType: 370,
      },
      bech32Config: Bech32Address.defaultBech32Config("vdl"),
      currencies: [
        {
          coinDenom: "VDL",
          coinMinimalDenom: "uvdl",
          coinDecimals: 6,
          // coinGeckoId: "vidulum",
          coinGeckoId: "pool:uvdl",
          coinImageUrl: "/tokens/vdl.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://explorers.vidulum.app/vidulum/tx/{txHash}",
    },
    {
      rpc: "https://rpc.mainnet.desmos.network",
      rest: "https://api.mainnet.desmos.network",
      chainId: "desmos-mainnet",
      chainName: "Desmos",
      bip44: {
        coinType: 852,
      },
      bech32Config: Bech32Address.defaultBech32Config("desmos"),
      currencies: [
        {
          coinDenom: "DSM",
          coinMinimalDenom: "udsm",
          coinDecimals: 6,
          coinGeckoId: "desmos",
          // coinGeckoId: "pool:udsm",
          coinImageUrl: "/tokens/dsm.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.01,
            average: 0.03,
            high: 0.05,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://explorer.desmos.network/transactions/{txHash}",
    },
    {
      rpc: "https://rpc-1-dig.notional.ventures",
      rest: "https://api-1-dig.notional.ventures",
      chainId: "dig-1",
      chainName: "Dig",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("dig"),
      currencies: [
        {
          coinDenom: "DIG",
          coinMinimalDenom: "udig",
          coinDecimals: 6,
          coinGeckoId: "dig-chain",
          // coinGeckoId: "pool:udig",
          coinImageUrl: "/tokens/dig.png",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.025,
            average: 0.03,
            high: 0.035,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://ping.pub/dig/tx/{txHash}",
    },
    {
      rpc: "https://rpc-sommelier.keplr.app",
      rest: "https://lcd-sommelier.keplr.app",
      chainId: "sommelier-3",
      chainName: "Sommelier",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("somm"),
      currencies: [
        {
          coinDenom: "SOMM",
          coinMinimalDenom: "usomm",
          coinDecimals: 6,
          // coinGeckoId: "sommelier",
          coinGeckoId: "pool:usomm",
          coinImageUrl: "/tokens/somm.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/sommelier/txs/{txHash}",
    },
    {
      rpc: "https://rpc.sifchain.finance",
      rest: "https://api-int.sifchain.finance",
      chainId: "sifchain-1",
      chainName: "Sifchain",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("sif"),
      currencies: [
        {
          coinDenom: "ROWAN",
          coinMinimalDenom: "rowan",
          coinDecimals: 18,
          // coinGeckoId: "sifchain",
          coinGeckoId: "pool:rowan",
          coinImageUrl: "/tokens/rowan.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 1000000000000 / 10**18,
            average: 1500000000000 / 10**18,
            high: 2000000000000 / 10**18,
          },
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://www.mintscan.io/sifchain/txs/{txHash}",
    },
    {
      rpc: "https://rpc.laozi3.bandchain.org",
      rest: "https://laozi1.bandchain.org/api",
      chainId: "laozi-mainnet",
      chainName: "BandChain",
      bip44: {
        coinType: 494,
      },
      bech32Config: Bech32Address.defaultBech32Config("band"),
      currencies: [
        {
          coinDenom: "BAND",
          coinMinimalDenom: "uband",
          coinDecimals: 6,
          // coinGeckoId: "band-protocol",
          coinGeckoId: "pool:uband",
          coinImageUrl: "/tokens/band.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://cosmoscan.io/tx/{txHash}",
    },
    {
      rpc: "https://node1.konstellation.tech:26657",
      rest: "https://node1.konstellation.tech:1318",
      chainId: "darchub",
      chainName: "Konstellation",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("darc"),
      currencies: [
        {
          coinDenom: "DARC",
          coinMinimalDenom: "udarc",
          coinDecimals: 6,
          // coinGeckoId: "darcmatter-coin",
          coinGeckoId: "pool:udarc",
          coinImageUrl: "/tokens/darc.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://www.mintscan.io/konstellation/txs/{txHash}",
    },
    {
      rpc: "https://rpc-umee.keplr.app",
      rest: "https://lcd-umee.keplr.app",
      chainId: "umee-1",
      chainName: "Umee",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("umee"),
      currencies: [
        {
          coinDenom: "UMEE",
          coinMinimalDenom: "uumee",
          coinDecimals: 6,
          coinGeckoId: "umee",
          // coinGeckoId: "pool:uumee",
          coinImageUrl: "/tokens/umee.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.05,
            average: 0.06,
            high: 0.1,
          },
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://www.mintscan.io/umee/txs/{txHash}",
    },
    {
      rpc: "https://gravitychain.io:26657",
      rest: "https://gravitychain.io:1317",
      chainId: "gravity-bridge-3",
      chainName: "Gravity Bridge",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("gravity"),
      currencies: [
        {
          coinDenom: "GRAV",
          coinMinimalDenom: "ugraviton",
          coinDecimals: 6,
          coinGeckoId: "graviton",
          // coinGeckoId: "pool:ugraviton",
          coinImageUrl: "/tokens/grav.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0,
            average: 0,
            high: 0.035,
          },
        },
        {
          coinDenom: "PSTAKE",
          coinMinimalDenom: "gravity0xfB5c6815cA3AC72Ce9F5006869AE67f18bF77006",
          coinDecimals: 18,
          coinGeckoId: "pstake-finance",
          // coinGeckoId: "pool:pstake",
          coinImageUrl: "/tokens/pstake.svg",
        },
        {
          coinDenom: "WBTC.grv",
          coinMinimalDenom: "gravity0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
          coinDecimals: 8,
          // coinGeckoId: "wrapped-bitcoin",
          coinGeckoId: "pool:wbtc-satoshi",
          coinImageUrl: "/tokens/wbtc.grv.svg",
        },
        {
          coinDenom: "wETH.grv",
          coinMinimalDenom: "gravity0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          coinDecimals: 18,
          // coinGeckoId: "weth",
          coinGeckoId: "pool:weth-wei.grv",
          coinImageUrl: "/tokens/weth.grv.svg",
        },
        {
          coinDenom: "USDC.grv",
          coinMinimalDenom: "gravity0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          coinDecimals: 6,
          coinGeckoId: "usd-coin",
          // coinGeckoId: "pool:uusdc.grv",
          coinImageUrl: "/tokens/usdc.grv.svg",
          pegMechanism: "collateralized",
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.0002,
            average: 0.0005,
            high: 0.0008,
          },
        },
        {
          coinDenom: "DAI.grv",
          coinMinimalDenom: "gravity0x6B175474E89094C44Da98b954EedeAC495271d0F",
          coinDecimals: 18,
          coinGeckoId: "dai",
          // coinGeckoId: "pool:dai-wei",
          coinImageUrl: "/tokens/dai.grv.svg",
          pegMechanism: "collateralized",
        },
        {
          coinDenom: "USDT.grv",
          coinMinimalDenom: "gravity0xdAC17F958D2ee523a2206206994597C13D831ec7",
          coinDecimals: 6,
          coinGeckoId: "tether",
          // coinGeckoId: "pool:uusdt.grv",
          coinImageUrl: "/tokens/usdt.grv.svg",
          pegMechanism: "collateralized",
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.0002,
            average: 0.0005,
            high: 0.0008,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/gravity-bridge/txs/{txHash}",
    },
    {
      rpc: "https://poseidon.mainnet.decentr.xyz",
      rest: "https://rest.mainnet.decentr.xyz",
      chainId: "mainnet-3",
      chainName: "Decentr",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("decentr"),
      currencies: [
        {
          coinDenom: "DEC",
          coinMinimalDenom: "udec",
          coinDecimals: 6,
          // coinGeckoId: "decentr",
          coinGeckoId: "pool:udec",
          coinImageUrl: "/tokens/dec.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx:
        "https://explorer.decentr.net/transactions/{txHash}?networkId=mainnet",
    },
    {
      rpc: "https://shenturpc.noopsbycertik.com/",
      rest: "https://rest.noopsbycertik.com",
      chainId: "shentu-2.2",
      chainName: "Shentu",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("certik"),
      currencies: [
        {
          coinDenom: "CTK",
          coinMinimalDenom: "uctk",
          coinDecimals: 6,
          // coinGeckoId: "shentu",
          //coinGeckoId: "pool:uctk",
          coinImageUrl: "/tokens/ctk.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/shentu/txs/{txHash}",
    },
    {
      rpc: "https://tm-api.carbon.network",
      rest: "https://api.carbon.network",
      chainId: "carbon-1",
      chainName: "Carbon",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("swth"),
      currencies: [
        {
          coinDenom: "SWTH",
          coinMinimalDenom: "swth",
          coinDecimals: 8,
          // coinGeckoId: "switcheo",
          coinGeckoId: "pool:swth",
          coinImageUrl: "/tokens/swth.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 1,
            average: 1,
            high: 1,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx:
        "https://scan.carbon.network/transaction/{txHash}?net=main",
    },
    {
      rpc: "https://rpc.injective.posthuman.digital:443",
      rest: "https://rest.injective.posthuman.digital:443",
      chainId: "injective-1",
      chainName: "Injective",
      bip44: {
        coinType: 60,
      },
      bech32Config: Bech32Address.defaultBech32Config("inj"),
      currencies: [
        {
          coinDenom: "INJ",
          coinMinimalDenom: "inj",
          coinDecimals: 18,
          coinGeckoId: "injective-protocol",
          // coinGeckoId: "pool:inj",
          coinImageUrl: "/tokens/inj.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 500000000,
            average: 700000000,
            high: 900000000,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go", "eth-address-gen", "eth-key-sign"],
      explorerUrlToTx:
        "https://explorer.injective.network/transaction/{txHash}",
    },
    {
      rpc: "https://rpc.cerberus.zone:26657",
      rest: "https://api.cerberus.zone:1317",
      chainId: "cerberus-chain-1",
      chainName: "Cerberus",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("cerberus"),
      currencies: [
        {
          coinDenom: "CRBRUS",
          coinMinimalDenom: "ucrbrus",
          coinDecimals: 6,
          // coinGeckoId: "cerberus-2",
          coinGeckoId: "pool:ucrbrus",
          coinImageUrl: "/tokens/crbrus.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://skynetexplorers.com/Cerberus/tx/{txHash}",
    },
    {
      rpc: "https://rpc-fetchhub.fetch.ai:443",
      rest: "https://rest-fetchhub.fetch.ai",
      chainId: "fetchhub-4",
      chainName: "Fetch.ai",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("fetch"),
      currencies: [
        {
          coinDenom: "FET",
          coinMinimalDenom: "afet",
          coinDecimals: 18,
          // coinGeckoId: "fetch-ai",
          coinGeckoId: "pool:afet",
          coinImageUrl: "/tokens/fet.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.025,
            average: 0.025,
            high: 0.035,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/fetchai/txs/{txHash}",
    },
    {
      rpc: "https://rpc.assetmantle.one/",
      rest: "https://rest.assetmantle.one/",
      chainId: "mantle-1",
      chainName: "AssetMantle",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("mantle"),
      currencies: [
        {
          coinDenom: "MNTL",
          coinMinimalDenom: "umntl",
          coinDecimals: 6,
          // coinGeckoId: "assetmantle",
          coinGeckoId: "pool:umntl",
          coinImageUrl: "/tokens/mntl.png",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.01,
            average: 0.025,
            high: 0.04,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/asset-mantle/txs/{txHash}",
    },
    {
      rpc: "https://rpc.provenance.io/",
      rest: "https://api.provenance.io",
      chainId: "pio-mainnet-1",
      chainName: "Provenance",
      bip44: {
        coinType: 505,
      },
      bech32Config: Bech32Address.defaultBech32Config("pb"),
      currencies: [
        {
          coinDenom: "HASH",
          coinMinimalDenom: "nhash",
          // coinGeckoId: "provenance-blockchain",
          coinGeckoId: "pool:nhash",
          coinDecimals: 9,
          coinImageUrl: "/tokens/prov.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 1905,
            average: 2100,
            high: 2500,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/provenance/txs/{txHash}",
    },
    {
      rpc: "https://galaxy-rpc.brocha.in",
      rest: "https://galaxy-rest.brocha.in",
      chainId: "galaxy-1",
      chainName: "Galaxy",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("galaxy"),
      currencies: [
        {
          coinDenom: "GLX",
          coinMinimalDenom: "uglx",
          coinDecimals: 6,
          coinGeckoId: "pool:uglx",
          coinImageUrl: "/tokens/glx.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.025,
            average: 0.025,
            high: 0.035,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://explorer.postcapitalist.io/galaxy/tx/{txHash}",
    },
    {
      rpc: "https://rpc-meme-1.meme.sx:443",
      rest: "https://api-meme-1.meme.sx:443",
      chainId: "meme-1",
      chainName: "Meme",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("meme"),
      currencies: [
        {
          coinDenom: "MEME",
          coinMinimalDenom: "umeme",
          coinDecimals: 6,
          coinGeckoId: "pool:umeme",
          coinImageUrl: "/tokens/meme.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.025,
            average: 0.035,
            high: 0.045,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://explorer.meme.sx/meme/tx/{txHash}",
    },
    {
      rpc: "https://rpc-evmos.keplr.app/",
      rest: "https://lcd-evmos.keplr.app/",
      chainId: "evmos_9001-2",
      chainName: "Evmos",
      bip44: {
        coinType: 60,
      },
      bech32Config: Bech32Address.defaultBech32Config("evmos"),
      currencies: [
        {
          coinDenom: "EVMOS",
          coinMinimalDenom: "aevmos",
          coinDecimals: 18,
          coinGeckoId: "evmos",
          // coinGeckoId: "pool:aevmos",
          coinImageUrl: "/tokens/evmos.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 25000000000,
            average: 25000000000,
            high: 40000000000,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go", "eth-address-gen", "eth-key-sign"],
      explorerUrlToTx: "https://www.mintscan.io/evmos/txs/{txHash}",
    },
    {
      rpc: "https://rpc.terrav2.ccvalidators.com/",
      rest: "https://phoenix-lcd.terra.dev/",
      chainId: "phoenix-1",
      chainName: "Terra 2.0",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("terra"),
      currencies: [
        {
          coinDenom: "LUNA",
          coinMinimalDenom: "uluna",
          coinDecimals: 6,
          coinGeckoId: "terra-luna-2",
          // coinGeckoId: "pool:uluna",
          coinImageUrl: "/tokens/luna.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.015,
            average: 0.025,
            high: 0.04,
          },
        },
      ],
      features: ["ibc-transfer"],
      explorerUrlToTx: "https://finder.terra.money/phoenix-1/tx/{txHash}",
    },
    {
      rpc: "https://rpcapi.rizon.world/",
      rest: "https://restapi.rizon.world/",
      chainId: "titan-1",
      chainName: "Rizon",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("rizon"),
      currencies: [
        {
          coinDenom: "ATOLO",
          coinMinimalDenom: "uatolo",
          coinDecimals: 6,
          coinGeckoId: "rizon",
          //coinGeckoId: "pool:uatolo",
          coinImageUrl: "/tokens/atolo.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.025,
            average: 0.025,
            high: 0.035,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/rizon/txs/{txHash}",
    },
    {
      rpc: "https://rpc-kava.keplr.app",
      rest: "https://lcd-kava.keplr.app",
      chainId: "kava_2222-10",
      chainName: "Kava",
      bip44: {
        coinType: 459,
      },
      bech32Config: Bech32Address.defaultBech32Config("kava"),
      currencies: [
        {
          coinDenom: "KAVA",
          coinMinimalDenom: "ukava",
          coinDecimals: 6,
          coinGeckoId: "kava",
          // coinGeckoId: "pool:ukava",
          coinImageUrl: "/tokens/kava.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.05,
            average: 0.1,
            high: 0.25,
          },
        },
        {
          coinDenom: "HARD",
          coinMinimalDenom: "hard",
          coinDecimals: 6,
          // coinGeckoId: "kava-lend",
          //coinGeckoId: "pool:hard",
          coinImageUrl: "/tokens/hard.svg",
        },
        {
          coinDenom: "SWP",
          coinMinimalDenom: "swp",
          coinDecimals: 6,
          // coinGeckoId: "kava-swap",
          //coinGeckoId: "pool:swp",
          coinImageUrl: "/tokens/swp.svg",
        },
        {
          coinDenom: "USDX",
          coinMinimalDenom: "usdx",
          coinDecimals: 6,
          coinGeckoId: "usdx",
          // coinGeckoId: "pool:usdx",
          coinImageUrl: "/tokens/usdx.svg",
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/kava/txs/{txHash}",
    },
    {
      rpc: "https://26657.genesisl1.org",
      rest: "https://api.genesisl1.org",
      chainId: "genesis_29-2",
      chainName: "GenesisL1",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("genesis"),
      currencies: [
        {
          coinDenom: "L1",
          coinMinimalDenom: "el1",
          coinDecimals: 18,
          coinGeckoId: "pool:el1",
          coinImageUrl: "/tokens/l1.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 999999999,
            average: 1000000000,
            high: 1000000001,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://ping.pub/genesisL1/tx/{txHash}",
    },
    {
      rpc: "https://rpc.kaiyo.kujira.setten.io",
      rest: "https://lcd.kaiyo.kujira.setten.io",
      chainId: "kaiyo-1",
      chainName: "Kujira",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("kujira"),
      currencies: [
        {
          coinDenom: "KUJI",
          coinMinimalDenom: "ukuji",
          coinDecimals: 6,
          coinGeckoId: "kujira",
          // coinGeckoId: "pool:ukuji",
          coinImageUrl: "/tokens/kuji.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.01,
            average: 0.025,
            high: 0.03,
          },
        },
        {
          coinDenom: "USK",
          coinMinimalDenom:
            "factory/kujira1qk00h5atutpsv900x202pxx42npjr9thg58dnqpa72f2p7m2luase444a7/uusk",
          coinDecimals: 6,
          coinGeckoId: "usk",
          coinImageUrl: "/tokens/usk.svg",
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://finder.kujira.app/kaiyo-1/tx/{txHash}",
    },
    {
      rpc: "https://rpc.mainnet-1.tgrade.confio.run",
      rest: "https://api.mainnet-1.tgrade.confio.run",
      chainId: "tgrade-mainnet-1",
      chainName: "Tgrade",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("tgrade"),
      currencies: [
        {
          coinDenom: "TGD",
          coinMinimalDenom: "utgd",
          coinDecimals: 6,
          // coinGeckoId: "tgrade",
          coinGeckoId: "pool:utgd",
          coinImageUrl: "/tokens/tgrade.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.05,
            average: 0.075,
            high: 0.1,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go", "wasmd_0.24+", "cosmwasm"],
      explorerUrlToTx: "https://tgrade.aneka.io/txs/{txHash}",
    },
    {
      rpc: "https://rpc-echelon.whispernode.com/",
      rest: "https://lcd-echelon.whispernode.com/",
      chainId: "echelon_3000-3",
      chainName: "Echelon",
      bip44: {
        coinType: 60,
      },
      bech32Config: Bech32Address.defaultBech32Config("echelon"),
      currencies: [
        {
          coinDenom: "ECH",
          coinMinimalDenom: "aechelon",
          coinDecimals: 18,
          // coinGeckoId: "echelon",
          coinGeckoId: "pool:aechelon",
          coinImageUrl: "/tokens/ech.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 10000000000,
            average: 25000000000,
            high: 40000000000,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://ping.pub/echelon/tx/{txHash}",
    },
    {
      rpc: "https://node.odin-freya-website.odinprotocol.io/mainnet/a/",
      rest: "https://node.odin-freya-website.odinprotocol.io/mainnet/a/api/",
      chainId: "odin-mainnet-freya",
      chainName: "Odin",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("odin"),
      currencies: [
        {
          coinDenom: "ODIN",
          coinMinimalDenom: "loki",
          coinDecimals: 6,
          // coinGeckoId: "odin-protocol",
          coinGeckoId: "pool:odin",
          coinImageUrl: "/tokens/odin.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.025,
            average: 0.05,
            high: 0.06,
          },
        },
        {
          coinDenom: "GEO",
          coinMinimalDenom: "mGeo",
          coinDecimals: 6,
          // coinGeckoId: "geodb",
          coinGeckoId: "pool:geo",
          coinImageUrl: "/tokens/geo.svg",
        },
        {
          coinDenom: "O9W",
          coinMinimalDenom: "mO9W",
          coinDecimals: 6,
          coinGeckoId: "pool:o9w",
          coinImageUrl: "/tokens/o9w.svg",
        },
      ],
      features: ["ibc-transfer", "ibc-go", "wasmd_0.24+", "cosmwasm"],
      explorerUrlToTx: "https://scan.odinprotocol.io/transactions/{txHash}",
    },
    {
      rpc: "https://mainnet.crescent.network:26657",
      rest: "https://mainnet.crescent.network:1317",
      chainId: "crescent-1",
      chainName: "Crescent",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("cre"),
      currencies: [
        {
          coinDenom: "CRE",
          coinMinimalDenom: "ucre",
          coinDecimals: 6,
          coinGeckoId: "crescent-network",
          // coinGeckoId: "pool:ucre",
          coinImageUrl: "/tokens/cre.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.01,
            average: 0.025,
            high: 0.03,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/crescent/txs/{txHash}",
    },
    {
      rpc: "https://rpc.lumenx.chaintools.tech",
      rest: "https://api.lumenx.chaintools.tech",
      chainId: "LumenX",
      chainName: "LumenX",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("lumen"),
      currencies: [
        {
          coinDenom: "LUMEN",
          coinMinimalDenom: "ulumen",
          coinDecimals: 6,
          coinGeckoId: "pool:ulumen",
          coinImageUrl: "/tokens/lumen.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.01,
            average: 0.025,
            high: 0.03,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://explorer.chaintools.tech/lumenx/tx/{txHash}",
    },
    {
      rpc: "https://rpc.orai.io",
      rest: "https://lcd.orai.io",
      chainId: "Oraichain",
      chainName: "Oraichain",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("orai"),
      currencies: [
        {
          coinDenom: "ORAI",
          coinMinimalDenom: "orai",
          coinDecimals: 6,
          //coinGeckoId: "oraichain-token",
          coinGeckoId: "pool:orai",
          coinImageUrl: "/tokens/orai.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.003,
            average: 0.005,
            high: 0.007,
          },
        },
      ],
      features: ["ibc-transfer", "cosmwasm"],
      explorerUrlToTx: "https://scan.orai.io/txs/{txHash}",
    },
    {
      rpc: "https://rpc.cudos.org",
      rest: "https://rest.cudos.org",
      chainId: "cudos-1",
      chainName: "Cudos",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("cudos"),
      currencies: [
        {
          coinDenom: "CUDOS",
          coinMinimalDenom: "acudos",
          coinDecimals: 18,
          // coinGeckoId: "cudos",
          coinGeckoId: "pool:acudos",
          coinImageUrl: "/tokens/cudos.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 5000000000000,
            average: 10000000000000,
            high: 20000000000000,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://explorer.cudos.org/transactions/{txHash}",
    },
    {
      rpc: "https://rpc-agoric-01.stakeflow.io",
      rest: "https://api-agoric-01.stakeflow.io",
      chainId: "agoric-3",
      chainName: "Agoric",
      bip44: {
        coinType: 564,
      },
      bech32Config: Bech32Address.defaultBech32Config("agoric"),
      currencies: [
        {
          coinDenom: "BLD",
          coinMinimalDenom: "ubld",
          coinDecimals: 6,
          coinGeckoId: "agoric",
          // coinGeckoId: "pool:ubld",
          coinImageUrl: "/tokens/bld.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.0075,
            average: 0.035,
            high: 0.07,
          },
        },
        {
          coinDenom: "IST",
          coinMinimalDenom: "uist",
          coinDecimals: 6,
          coinGeckoId: "inter-stable-token",
          coinImageUrl: "/tokens/ist.svg",
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.0034,
            average: 0.007,
            high: 0.02,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://agoric.bigdipper.live/transactions/{txHash}",
    },
    {
      rpc: "https://stride-rpc.polkachu.com/",
      rest: "https://stride-api.polkachu.com/",
      chainId: "stride-1",
      chainName: "Stride",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("stride"),
      currencies: [
        {
          coinDenom: "STRD",
          coinMinimalDenom: "ustrd",
          coinDecimals: 6,
          coinGeckoId: "stride",
          // coinGeckoId: "pool:ustrd",
          coinImageUrl: "/tokens/strd.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0,
            average: 0,
            high: 0.04,
          },
        },
        {
          coinDenom: "stATOM",
          coinMinimalDenom: "stuatom",
          coinDecimals: 6,
          coinGeckoId: "stride-staked-atom",
          // coinGeckoId: "pool:stuatom",
          coinImageUrl: "/tokens/statom.svg",
        },
        {
          coinDenom: "stINJ",
          coinMinimalDenom: "stinj",
          coinDecimals: 18,
          coinGeckoId: "pool:stinj",
          coinImageUrl: "/tokens/stinj.svg",
        },
        {
          coinDenom: "stSTARS",
          coinMinimalDenom: "stustars",
          coinDecimals: 6,
          coinGeckoId: "pool:stustars",
          coinImageUrl: "/tokens/ststars.svg",
        },
        {
          coinDenom: "stOSMO",
          coinMinimalDenom: "stuosmo",
          coinDecimals: 6,
          coinGeckoId: "stride-staked-osmo",
          coinImageUrl: "/tokens/stosmo.svg",
        },
        {
          coinDenom: "stJUNO",
          coinMinimalDenom: "stujuno",
          coinDecimals: 6,
          coinGeckoId: "pool:stujuno",
          coinImageUrl: "/tokens/stjuno.svg",
        },
        {
          coinDenom: "stSCRT",
          coinMinimalDenom: "stuscrt",
          coinDecimals: 6,
          // coinGeckoId: "secret",
          coinImageUrl: "/tokens/stscrt.svg",
        },
        {
          coinDenom: "stLUNA",
          coinMinimalDenom: "stuluna",
          coinDecimals: 6,
          coinGeckoId: "pool:stuluna",
          coinImageUrl: "/tokens/stluna.svg",
        },
        {
          coinDenom: "stEVMOS",
          coinMinimalDenom: "staevmos",
          coinDecimals: 18,
          coinGeckoId: "pool:staevmos",
          coinImageUrl: "/tokens/stevmos.svg",
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://explorer.stride.zone/stride/tx/{txHash}",
    },
    {
      rpc: "https://api.mainnet.rebus.money:26657",
      rest: "https://api.mainnet.rebus.money:1317",
      chainId: "reb_1111-1",
      chainName: "Rebus",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("rebus"),
      currencies: [
        {
          coinDenom: "REBUS",
          coinMinimalDenom: "arebus",
          coinDecimals: 18,
          // coinGeckoId: "rebus",
          coinGeckoId: "pool:arebus",
          coinImageUrl: "/tokens/rebus.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://rebus.explorers.guru/transaction/{txHash}",
    },
    {
      rpc: "https://rpc.mainnet.teritori.com/",
      rest: "https://rest.mainnet.teritori.com/",
      chainId: "teritori-1",
      chainName: "Teritori",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("tori"),
      currencies: [
        {
          coinDenom: "TORI",
          coinMinimalDenom: "utori",
          coinDecimals: 6,
          // coinGeckoId: "teritori",
          coinGeckoId: "pool:utori",
          coinImageUrl: "/tokens/utori.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.0,
            average: 0.25,
            high: 0.5,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://explorer.teritori.com/teritori/tx/{txHash}",
    },
    {
      rpc: "https://rpc.lambda.im",
      rest: "https://rest.lambda.im",
      chainId: "lambda_92000-1",
      chainName: "Lambda",
      bip44: {
        coinType: 60,
      },
      bech32Config: Bech32Address.defaultBech32Config("lamb"),
      currencies: [
        {
          coinDenom: "LAMB",
          coinMinimalDenom: "ulamb",
          coinDecimals: 18,
          // coinGeckoId: "lambda",
          coinGeckoId: "pool:lambda",
          coinImageUrl: "/tokens/lambda.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 10000000000,
            average: 25000000000,
            high: 40000000000,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go", "eth-address-gen", "eth-key-sign"],
      explorerUrlToTx: "https://explorer.nodestake.top/lambda/tx/{txHash}",
    },
    {
      rpc: "https://rpc.unification.chainmasters.ninja",
      rest: "https://rest.unification.chainmasters.ninja",
      chainId: "FUND-MainNet-2",
      chainName: "Unification",
      bip44: {
        coinType: 5555,
      },
      bech32Config: Bech32Address.defaultBech32Config("und"),
      currencies: [
        {
          coinDenom: "FUND",
          coinMinimalDenom: "nund",
          coinDecimals: 9,
          // coinGeckoId: "unification",
          coinGeckoId: "pool:nund",
          coinImageUrl: "/tokens/fund.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 100,
            average: 200,
            high: 300,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx:
        "https://explorer.unification.chainmasters.ninja/unification/tx/{txHash}",
    },
    {
      rpc: "https://rpc.jackalprotocol.com",
      rest: "https://api.jackalprotocol.com",
      chainId: "jackal-1",
      chainName: "Jackal",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("jkl"),
      currencies: [
        {
          coinDenom: "JKL",
          coinMinimalDenom: "ujkl",
          coinDecimals: 6,
          coinGeckoId: "pool:jkl",
          coinImageUrl: "/tokens/jkl.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.01,
            average: 0.025,
            high: 0.03,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://ping.pub/jackal/tx/{txHash}",
    },
    {
      rpc: "https://rpc.getbze.com",
      rest: "https://rest.getbze.com",
      chainId: "beezee-1",
      chainName: "BeeZee",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("bze"),
      currencies: [
        {
          coinDenom: "BZE",
          coinMinimalDenom: "ubze",
          coinDecimals: 6,
          coinGeckoId: "pool:ubze",
          // coinGeckoId: "BZEdge",
          coinImageUrl: "/tokens/bze.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://explorer.thesilverfox.pro/beezee/tx/{txHash}",
    },
    {
      rpc: "https://rpc-acre.synergynodes.com/",
      rest: "https://lcd-acre.synergynodes.com/",
      chainId: "acre_9052-1",
      chainName: "Acrechain",
      bip44: {
        coinType: 60,
      },
      bech32Config: Bech32Address.defaultBech32Config("acre"),
      currencies: [
        {
          coinDenom: "ACRE",
          coinMinimalDenom: "aacre",
          coinDecimals: 18,
          coinGeckoId: "pool:aacre",
          // coinGeckoId: "arable-protocol",
          coinImageUrl: "/tokens/acre.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 20000000000,
            average: 25000000000,
            high: 40000000000,
          },
        },
        {
          coinDenom: "arUSD",
          coinMinimalDenom: "erc20/0x2Cbea61fdfDFA520Ee99700F104D5b75ADf50B0c",
          coinDecimals: 18,
          coinGeckoId: "pool:erc20/0x2Cbea61fdfDFA520Ee99700F104D5b75ADf50B0c",
          coinImageUrl: "/tokens/arusd.svg",
        },
        {
          coinDenom: "CNTO",
          coinMinimalDenom: "erc20/0xAE6D3334989a22A65228732446731438672418F2",
          coinDecimals: 18,
          coinGeckoId: "pool:erc20/0xAE6D3334989a22A65228732446731438672418F2",
          coinImageUrl: "/tokens/cnto.svg",
        },
      ],
      features: ["ibc-transfer", "ibc-go", "eth-address-gen", "eth-key-sign"],
      explorerUrlToTx: "https://cosmosrun.info/acre-mainnet/tx/{txHash}",
    },
    {
      rpc: "https://rpc.imversed.network:443",
      rest: "https://rest.imversed.network:443",
      chainId: "imversed_5555555-1",
      chainName: "Imversed",
      bip44: {
        coinType: 60,
      },
      bech32Config: Bech32Address.defaultBech32Config("imv"),
      currencies: [
        {
          coinDenom: "IMV",
          coinMinimalDenom: "aimv",
          coinDecimals: 18,
          coinGeckoId: "pool:aimv",
          coinImageUrl: "/tokens/imversed.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 20000000000,
            average: 25000000000,
            high: 40000000000,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go", "eth-address-gen", "eth-key-sign"],
      explorerUrlToTx: "https://txe.imversed.network/tx/{txHash}",
    },
    {
      rpc: "https://rpc.medas-digital.io:26657",
      rest: "https://lcd.medas-digital.io:1317",
      chainId: "medasdigital-1",
      chainName: "Medas Digital Network",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("medas"),
      currencies: [
        {
          coinDenom: "MEDAS",
          coinMinimalDenom: "umedas",
          coinDecimals: 6,
          // coinGeckoId: "medasdigital",
          coinGeckoId: "pool:umedas",
          coinImageUrl: "/tokens/medas.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0,
            average: 0.0001,
            high: 0.00025,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/medasdigital/txs/{txHash}",
    },
    {
      rpc: "https://rpc-mainnet.onomy.io",
      rest: "https://rest-mainnet.onomy.io",
      chainId: "onomy-mainnet-1",
      chainName: "Onomy",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("onomy"),
      currencies: [
        {
          coinDenom: "NOM",
          coinMinimalDenom: "anom",
          coinDecimals: 18,
          coinGeckoId: "pool:anom",
          coinImageUrl: "/tokens/nom.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0,
            average: 0.03,
            high: 0.06,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/onomy-protocol/txs/{txHash}",
    },
    {
      rpc: "https://rpc.planq.network/",
      rest: "https://rest.planq.network/",
      chainId: "planq_7070-2",
      chainName: "Planq",
      bip44: {
        coinType: 60,
      },
      bech32Config: Bech32Address.defaultBech32Config("plq"),
      currencies: [
        {
          coinDenom: "PLQ",
          coinMinimalDenom: "aplanq",
          coinDecimals: 18,
          coinGeckoId: "pool:aplanq",
          coinImageUrl: "/tokens/planq.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 30000000000,
            average: 35000000000,
            high: 40000000000,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go", "eth-address-gen", "eth-key-sign"],
      explorerUrlToTx: "https://ping.pub/planq/tx/{txHash}",
    },
    {
      rpc: "https://dys-tm.dysonprotocol.com:443",
      rest: "https://dys-api.dysonprotocol.com:443",
      chainId: "dyson-mainnet-01",
      chainName: "Dyson Protocol",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("dys"),
      currencies: [
        {
          coinDenom: "DYS",
          coinMinimalDenom: "dys",
          coinDecimals: 0,
          coinGeckoId: "pool:dys",
          coinImageUrl: "/tokens/dys.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.0001,
            average: 0.0002,
            high: 0.0003,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx:
        "https://explorer.dys.dysonprotocol.com/dyson/tx/{txHash}",
    },
    {
      rpc: IS_TESTNET
        ? "https://testnet-rpc.marsprotocol.io/"
        : "https://rpc.marsprotocol.io/",
      rest: IS_TESTNET
        ? "https://testnet-rest.marsprotocol.io/"
        : "https://rest.marsprotocol.io/",
      chainId: IS_TESTNET ? "ares-1" : "mars-1",
      chainName: IS_TESTNET ? "Mars Hub Testnet" : "Mars Hub",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("mars"),
      currencies: [
        {
          coinDenom: "MARS",
          coinMinimalDenom: "umars",
          coinDecimals: 6,
          coinGeckoId: "pool:mars",
          coinImageUrl: "/tokens/mars.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: IS_TESTNET
            ? {
              low: 0,
              average: 0,
              high: 0.025,
            }
            : {
              low: 0,
              average: 0,
              high: 0.01,
            },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: IS_TESTNET
        ? "https://testnet-explorer.marsprotocol.io/transactions/{txHash}"
        : "https://explorer.marsprotocol.io/transactions/{txHash}",
    },
    {
      rpc: "https://rpc.canto.nodestake.top",
      rest: "https://api.canto.nodestake.top",
      chainId: "canto_7700-1",
      chainName: "Canto",
      bip44: {
        coinType: 60,
      },
      bech32Config: Bech32Address.defaultBech32Config("canto"),
      currencies: [
        {
          coinDenom: "CANTO",
          coinMinimalDenom: "acanto",
          coinDecimals: 18,
          coinImageUrl: "/tokens/canto.svg",
          coinGeckoId: "pool:acanto",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 1000000000000,
            average: 2000000000000,
            high: 3000000000000,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go", "eth-address-gen", "eth-key-sign"],
      explorerUrlToTx: "https://cosmos-explorers.neobase.one/canto/tx/{txHash}",
    },
    {
      rpc: "https://rpc-quicksilver.huginn.tech",
      rest: "https://quicksilver.api.kjnodes.com",
      chainId: "quicksilver-2",
      chainName: "Quicksilver",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("quick"),
      currencies: [
        {
          coinDenom: "QCK",
          coinMinimalDenom: "uqck",
          coinDecimals: 6,
          coinImageUrl: "/tokens/qck.svg",
          coinGeckoId: "quicksilver",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.0001,
            average: 0.0001,
            high: 0.00025,
          },
        },
        {
          coinDenom: "qSTARS",
          coinMinimalDenom: "uqstars",
          coinDecimals: 6,
          coinImageUrl: "/tokens/qstars.svg",
          coinGeckoId: "pool:uqstars",
        },
        {
          coinDenom: "qATOM",
          coinMinimalDenom: "uqatom",
          coinDecimals: 6,
          coinImageUrl: "/tokens/qatom.svg",
          coinGeckoId: "pool:uqatom",
        },
        {
          coinDenom: "qREGEN",
          coinMinimalDenom: "uqregen",
          coinDecimals: 6,
          coinImageUrl: "/tokens/qregen.svg",
          coinGeckoId: "pool:uqregen",
        },
        {
          coinDenom: "qOSMO",
          coinMinimalDenom: "uqosmo",
          coinDecimals: 6,
          coinImageUrl: "/tokens/qosmo.svg",
          coinGeckoId: "pool:uqosmo",
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/quicksilver/txs/{txHash}",
    },
    {
      rpc: "https://rpc.8ball.info",
      rest: "https://rest.8ball.info",
      chainId: "eightball-1",
      chainName: "8ball",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("8ball"),
      currencies: [
        {
          coinDenom: "EBL",
          coinMinimalDenom: "uebl",
          coinDecimals: 6,
          coinImageUrl: "/tokens/8ball.svg",
          coinGeckoId: "pool:uebl",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0,
            average: 0.025,
            high: 0.04,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://explorer.8ball.info/8ball/tx/{txHash}",
    },
    {
      rpc: "https://arkh-rpc.kynraze.com",
      rest: "https://arkh-api.kynraze.com",
      chainId: "arkh",
      chainName: "Arkhadian",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("arkh"),
      currencies: [
        {
          coinDenom: "ARKH",
          coinMinimalDenom: "arkh",
          coinDecimals: 6,
          coinImageUrl: "/tokens/arkh.svg",
          coinGeckoId: "pool:arkh",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.01,
            average: 0.025,
            high: 0.03,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://explorer.kynraze.com/arkhadian/tx/{txHash}",
    },
    {
      rpc: "https://rpc.mainnet.noble.strange.love",
      rest: "https://noble-api.polkachu.com",
      chainId: "noble-1",
      chainName: "Noble",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("noble"),
      currencies: [
        {
          coinDenom: "STAKE",
          coinMinimalDenom: "ustake",
          coinDecimals: 6,
          coinImageUrl: "/tokens/stake.svg",
          coinGeckoId: "pool:ustake",
          isStakeCurrency: true,
        },
        {
          coinDenom: "nUSDC",
          coinMinimalDenom: "uusdc",
          coinDecimals: 6,
          coinImageUrl: "/tokens/usdc.svg",
          coinGeckoId: "usd-coin",
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.01,
            average: 0.025,
            high: 0.03,
          },
        },
        {
          coinDenom: "FRNZ",
          coinMinimalDenom: "ufrienzies",
          coinDecimals: 6,
          coinImageUrl: "/tokens/frnz.svg",
          coinGeckoId: "pool:frnz",
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
    },
    {
      rpc: "https://whitewhale-rpc.lavenderfive.com",
      rest: "https://whitewhale-api.lavenderfive.com",
      chainId: "migaloo-1",
      chainName: "Migaloo",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("migaloo"),
      currencies: [
        {
          coinDenom: "WHALE",
          coinMinimalDenom: "uwhale",
          coinDecimals: 6,
          coinImageUrl: "/tokens/white-whale.svg",
          coinGeckoId: "pool:uwhale",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0,
            average: 0,
            high: 0,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://ping.pub/migaloo/tx/{txHash}",
    },
    {
      rpc: IS_TESTNET ? "https://net-rila.nolus.io:26657" : "",
      rest: IS_TESTNET ? "https://net-rila.nolus.io:1317" : "",
      chainId: IS_TESTNET ? "nolus-rila" : "",
      chainName: IS_TESTNET ? "Rila Testnet" : "",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("nolus"),
      currencies: [
        {
          coinDenom: "NLS",
          coinMinimalDenom: "unls",
          coinDecimals: 6,
          coinGeckoId: "pool:unls",
          coinImageUrl: "/tokens/nolus.svg",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0,
            average: 0,
            high: 0.025,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: IS_TESTNET
        ? "https://explorer-rila.nolus.io/nolus-rila/tx/{txHash}"
        : "",
    },
    {
      rpc: "https://rpc.omniflix.network",
      rest: "https://rest.omniflix.network",
      chainId: "omniflixhub-1",
      chainName: "OmniFlix",
      bip44: {
        coinType: 118,
      },
      bech32Config: Bech32Address.defaultBech32Config("omniflix"),
      currencies: [
        {
          coinDenom: "FLIX",
          coinMinimalDenom: "uflix",
          coinDecimals: 6,
          coinImageUrl: "/tokens/flix.svg",
          coinGeckoId: "pool:uflix",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.001,
            average: 0.0025,
            high: 0.025,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://www.mintscan.io/omniflix/txs/{txHash}",
    },
    {
      rpc: "https://a.client.sentry.net.bluzelle.com:26657",
      rest: "https://a.client.sentry.net.bluzelle.com:1317",
      chainId: "bluzelle-9",
      chainName: "Bluzelle",
      bip44: {
        coinType: 483,
      },
      bech32Config: Bech32Address.defaultBech32Config("bluzelle"),
      currencies: [
        {
          coinDenom: "BLZ",
          coinMinimalDenom: "ubnt",
          coinDecimals: 6,
          coinImageUrl: "/tokens/bluzelle.svg",
          coinGeckoId: "pool:ubnt",
          isStakeCurrency: true,
          isFeeCurrency: true,
          gasPriceStep: {
            low: 0.002,
            average: 0.002,
            high: 0.025,
          },
        },
      ],
      features: ["ibc-transfer", "ibc-go"],
      explorerUrlToTx: "https://bd.explorer.net.bluzelle.com/transactions/${txHash}",
    },
  ] as SimplifiedChainInfo[]
);

// Add normal chain infos in case of `currencies` not containing the stake or fee currency.
chainInfos.push({
  rpc: IS_TESTNET
    ? "https://axelartest-rpc.quickapi.com/"
    : "https://rpc.axelar.bh.rocks", // source: https://docs.axelar.dev/resources
  rest: IS_TESTNET
    ? "https://axelartest-lcd.quickapi.com/"
    : "https://api.axelar.bh.rocks/",
  chainId: IS_TESTNET ? "axelar-testnet-lisbon-3" : "axelar-dojo-1",
  chainName: "Axelar",
  bip44: {
    coinType: 118,
  },
  bech32Config: Bech32Address.defaultBech32Config("axelar"),
  currencies: [
    {
      coinDenom: "AXL",
      coinMinimalDenom: "uaxl",
      coinDecimals: 6,
      coinGeckoId: "axelar",
      // coinGeckoId: "pool:uaxl",
      coinImageUrl: "/tokens/axl.svg",
    },
    {
      coinDenom: IS_TESTNET ? "aUSDC" : "USDC",
      coinMinimalDenom: IS_TESTNET ? "uausdc" : "uusdc",
      coinDecimals: 6,
      coinGeckoId: "usd-coin",
      coinImageUrl: "/tokens/usdc.svg",
    },
    {
      coinDenom: "FRAX",
      coinMinimalDenom: "frax-wei",
      coinDecimals: 18,
      coinGeckoId: "frax",
      coinImageUrl: "/tokens/frax.svg",
    },
    {
      coinDenom: "USDT",
      coinMinimalDenom: "uusdt",
      coinDecimals: 6,
      coinGeckoId: "tether",
      // coinGeckoId: "pool:uusdt.grv",
      coinImageUrl: "/tokens/usdt.svg",
    },
    {
      coinDenom: "DAI",
      coinMinimalDenom: "dai-wei",
      coinDecimals: 18,
      // coinGeckoId: "dai",
      coinGeckoId: "pool:dai-wei",
      coinImageUrl: "/tokens/dai.svg",
    },
    {
      coinDenom: "ETH",
      coinMinimalDenom: "weth-wei",
      coinDecimals: 18,
      // coinGeckoId: "weth",
      coinGeckoId: "pool:weth-wei",
      coinImageUrl: "/tokens/eth-white.svg",
    },
    {
      coinDenom: "WBTC",
      coinMinimalDenom: "wbtc-satoshi",
      coinDecimals: 8,
      // coinGeckoId: "wrapped-bitcoin",
      coinGeckoId: "pool:wbtc-satoshi",
      coinImageUrl: "/tokens/wbtc.png",
    },
    {
      coinDenom: "LINK",
      coinMinimalDenom: "link-wei",
      coinDecimals: 18,
      coinGeckoId: "chainlink",
      // coinGeckoId: "pool:link-wei",
      coinImageUrl: "/tokens/link.svg",
    },
    {
      coinDenom: "FIL",
      coinMinimalDenom: "wfil-wei",
      coinDecimals: 18,
      //coinGeckoId: "filecoin",
      coinGeckoId: "pool:wfil-wei",
      coinImageUrl: "/tokens/fil.svg",
    },
    {
      coinDenom: "AAVE",
      coinMinimalDenom: "aave-wei",
      coinDecimals: 18,
      coinGeckoId: "aave",
      coinImageUrl: "/tokens/aave.svg",
    },
    {
      coinDenom: "APE",
      coinMinimalDenom: "ape-wei",
      coinDecimals: 18,
      coinGeckoId: "apecoin",
      coinImageUrl: "/tokens/ape.svg",
    },
    {
      coinDenom: "AXS",
      coinMinimalDenom: "axs-wei",
      coinDecimals: 18,
      coinGeckoId: "axie-infinity",
      coinImageUrl: "/tokens/axs.svg",
    },
    {
      coinDenom: "MKR",
      coinMinimalDenom: "mkr-wei",
      coinDecimals: 18,
      // coinGeckoId: "maker",
      coinGeckoId: "pool:mkr-wei",
      coinImageUrl: "/tokens/mkr.svg",
    },
    {
      coinDenom: "RAI",
      coinMinimalDenom: "rai-wei",
      coinDecimals: 18,
      coinGeckoId: "rai",
      coinImageUrl: "/tokens/rai.svg",
    },
    {
      coinDenom: "SHIB",
      coinMinimalDenom: "shib-wei",
      coinDecimals: 18,
      coinGeckoId: "shiba-inu",
      coinImageUrl: "/tokens/shib.svg",
    },
    {
      coinDenom: "stETH",
      coinMinimalDenom: "steth-wei",
      coinDecimals: 18,
      coinGeckoId: "staked-ether",
      coinImageUrl: "/tokens/steth.svg",
    },
    {
      coinDenom: "UNI",
      coinMinimalDenom: "uni-wei",
      coinDecimals: 18,
      coinGeckoId: "uniswap",
      coinImageUrl: "/tokens/uni.svg",
    },
    {
      coinDenom: "XCN",
      coinMinimalDenom: "xcn-wei",
      coinDecimals: 18,
      coinGeckoId: "chain-2",
      coinImageUrl: "/tokens/xcn.svg",
    },
    {
      coinDenom: "GLMR",
      coinMinimalDenom: IS_TESTNET ? "wdev-wei" : "wglmr-wei",
      coinDecimals: 18,
      coinGeckoId: "wrapped-moonbeam",
      coinImageUrl: "/tokens/glmr.svg",
    },
    {
      coinDenom: "DOT",
      coinMinimalDenom: "dot-planck",
      coinDecimals: 10,
      //coinGeckoId: "polkadot",
      coinGeckoId: "pool:dotplanck.axl",
      coinImageUrl: "/tokens/dot.svg",
    },
    {
      coinDenom: "BNB",
      coinMinimalDenom: "wbnb-wei",
      coinDecimals: 18,
      //coinGeckoId: "wbnb",
      coinGeckoId: "pool:wbnbwei.axl",
      coinImageUrl: "/tokens/bnb.svg",
    },
    {
      coinDenom: "MATIC",
      coinMinimalDenom: "wmatic-wei",
      coinDecimals: 18,
      //coinGeckoId: "wmatic",
      coinGeckoId: "pool:wmaticwei.axl",
      coinImageUrl: "/tokens/matic-purple.svg",
    },
    {
      coinDenom: "BUSD",
      coinMinimalDenom: "busd-wei",
      coinDecimals: 18,
      //coinGeckoId: "binance-usd",
      coinGeckoId: "pool:busdwei.axl",
      coinImageUrl: "/tokens/busd.svg",
    },
    {
      coinDenom: "AVAX",
      coinMinimalDenom: "wavax-wei",
      coinDecimals: 18,
      //coinGeckoId: "avalanche-2",
      coinGeckoId: "pool:wavaxwei.axl",
      coinImageUrl: "/tokens/avax.svg",
    },
    {
      coinDenom: "FTM",
      coinMinimalDenom: "wftm-wei",
      coinDecimals: 18,
      //coinGeckoId: "fantom",
      coinGeckoId: "pool:wftm-wei",
      coinImageUrl: "/tokens/ftm.svg",
    },
    {
      coinDenom: "polygon.USDC",
      coinMinimalDenom: "polygon-uusdc",
      coinDecimals: 6,
      coinGeckoId: "usd-coin",
      coinImageUrl: "/tokens/polygon.usdc.svg",
    },
    {
      coinDenom: "avalanche.USDC",
      coinMinimalDenom: "avalanche-uusdc",
      coinDecimals: 6,
      coinGeckoId: "usd-coin",
      coinImageUrl: "/tokens/avalanche.usdc.svg",
    },
  ],
  gasPriceStep: IS_TESTNET
    ? {
      low: 0.007,
      average: 0.125,
      high: 0.2,
    }
    : {
      low: 0.0025,
      average: 0.003,
      high: 0.01,
    },
  features: ["ibc-transfer", "ibc-go"],
});

export const ChainInfos: SimplifiedChainInfo[] = chainInfos;
