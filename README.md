# Farming Bot for Sunflower Farmer
This repository includes a farming bot.

## How to Use

```shell
git clone --recursive https://github.com/rhiroshi/sunflower-farmers-bot.git

# Install deps
yarn

# Set your private keys. The bot will iterate with all the keys in the array (on harvest.ts)
vim hardhat.config.ts

# Create and configure .env file. See .env-example file

# Step 1: Send MATIC and SFF to your farm wallet

# Step 2: Create farm
# The wallet must have 0.1 MATIC (for charity) and few SFF (for leveling)
env WALLET=1 npx hardhat run scripts/createFarm.ts --network polygon

# Step 3: Earn without playing
npx hardhat run scripts/harvest.ts --network polygon
```

## Licenses
- scripts/*.ts: me (MIT License) No wannary
- contracts/*.sol: [Sunflower Farmer](https://github.com/sunflower-farmers/sunflower-farmers) (MIT License)
