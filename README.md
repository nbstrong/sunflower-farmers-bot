# Farming Bot for Sunflower Farmer
This repository includes a potato🥔 farming bot. **I don't provide any support.**

## How to Use

```shell
git clone --recursive https://github.com/mikoim/sunflower-farmers-bot.git

# install deps
yarn

# set your private keys
vim hardhat.config.ts 

# Step 1: Send MATIC and SFF to your farm wallet

# Step 2: Create farm
# The wallet must have 0.1 MATIC (for charity) and few SFF (for leveling)
env WALLET=1 npx hardhat run scripts/createFarm.ts --network polygon

# Step 3: Earn without playing 
env WALLET=1 npx hardhat run scripts/harvest.ts --network polygon
```

## FAQ

### Why do you publish bot?
Sunflower Farmer is a funny blockchain game that reminds me of legacy browser games. But Play-To-Earn is awful. That's everything.

## Licenses
- scripts/*.ts: me (MIT License) No wannary
- contracts/*.sol: [Sunflower Farmer](https://github.com/sunflower-farmers/sunflower-farmers) (MIT License)
