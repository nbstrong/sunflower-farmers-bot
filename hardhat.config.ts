import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";

import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: resolve(__dirname, "./.env") });

let wallets = process.env.PRIVATE_KEY?.split(" ");

export default {
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      {
        version: "0.8.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 4294967295,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      mining: {
        auto: true,
      },
      initialBaseFeePerGas: 0, // TODO: remove this line https://github.com/sc-forks/solidity-coverage/issues/652
    },
    polygon: {
      chainId: 137,
      url: "https://polygon-rpc.com",
      gasPrice: 30000000000, // 30 gwei
      accounts: wallets,
    },
    localhost: {
      gasPrice: 30000000000, // 30 gwei
      accounts: wallets,
    },
  },
  gasReporter: {
    currency: "USD",
    token: "MATIC",
    gasPriceApi:
      "https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice",
    gasPrice: 30,
  },
};
