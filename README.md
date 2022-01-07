# Farming Bot for Sunflower Farmer
This repository includes a farming bot.

## How to Use

```shell
git clone --recursive https://github.com/rhiroshi/sunflower-farmers-bot.git

# Install deps
yarn

# Step 1: Create and configure .env file. See .env-example file

# Step 2: Send MATIC and SFF to your farm wallet

# Step 3: Start the bot. It will create the farm and start plant/harvest whenever possible
# The wallet must have 0.1 MATIC (for charity) and few SFF (for leveling)

npx hardhat run scripts/bot.ts --network polygon
```

## Licenses
- scripts/bot.ts is based in Eshin Kunishima's code (MIT License)
- contracts/*.sol: [Sunflower Farmer](https://github.com/sunflower-farmers/sunflower-farmers) (MIT License)
