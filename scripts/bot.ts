import { ethers } from "hardhat";
import { FarmV2__factory, TokenV2__factory } from "../typechain-types";
import moment from "moment";
import { EventStruct } from "../typechain-types/FarmV2";
import axios from "axios";
import 'dotenv/config';
const { fruits } = require('./utils/fruits');
const { farmLenghts } = require('./utils/farmLengths');

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let signers = await ethers.getSigners();
  let signerIndex = 0;
  let gasLimit = process.env.GAS_LIMIT || 500;
  let desiredFruit = process.env.DESIRED_FRUIT || 2;
  let waitSeconds = +(process.env.WAIT_SECONDS || 90);
  let desiredFarmLevel = process.env.DESIRED_FARM_LEVEL || 1;
  let desiredFarmLength = farmLenghts[desiredFarmLevel];
  if(typeof desiredFarmLength == 'undefined') throw `Error: Farm level '${desiredFarmLevel}' is unavailable. Fix on your .env file`;
  console.log("Your desired fruit is: ",fruits[desiredFruit.toString()].name)
  let harvestTimeArray:number[] = [];
  let gasValues = await axios.get("https://gasstation-mainnet.matic.network/");

  console.log("===== Checking Farm status =====");
  for(let i = 0; i < signers.length; i++){
    let signer = signers[i];
    let signerAddress = signer.address;
    let farm_v2 = FarmV2__factory.connect("0x6e5fa679211d7f6b54e14e187d34ba547c5d3fe0", signer);
    let sff = TokenV2__factory.connect("0xdf9b4b57865b403e08c85568442f95c26b7896b0", signer);
    console.log("[", i+1, "] ", signerAddress);
    console.log(ethers.utils.formatEther(await sff.balanceOf(signerAddress)), "SFF");
    console.log(ethers.utils.formatEther(await ethers.provider.getBalance(signerAddress)), 'MATIC')

    let farm = await farm_v2.getFarm(signerAddress);
    if (farm.length == 0) {
        console.log("Creating farm...");
        let createFarmTransaction = await farm_v2.createFarm("0x060697E9d4EEa886EbeCe57A974Facd53A40865B", {value: ethers.utils.parseEther("0.1")});
        console.log("Created transaction ",createFarmTransaction);
        console.log((await createFarmTransaction.wait()).transactionHash);
        farm = await farm_v2.getFarm(signerAddress);
        console.log("Created farm!");
    }

    while (farm.length < desiredFarmLength) {
        console.log(`Leveling up... ${farm.length} < ${desiredFarmLength}`);
        let levelUpTransaction = await farm_v2.levelUp();
        console.log("Created transaction ", levelUpTransaction);
        console.log((await levelUpTransaction.wait()).transactionHash);
        farm = await farm_v2.getFarm(signerAddress);
        console.log(`Farm Level up!`);
    }
  }

  console.log("===== Starting harvest bot =====");
  while (true) {
    if(signerIndex == signers.length){
      let closestHarvestTime = Math.min(...harvestTimeArray.map((n) => n));
      console.log(moment().format(), " Reached end of wallet array. waiting for the closest harvest time :", closestHarvestTime);
      harvestTimeArray = [];
      signerIndex = 0;
      await delay(closestHarvestTime * 1000);
    }
    let signer = signers[signerIndex];
    let signerAddress = signer.address;
    let farm_v2 = FarmV2__factory.connect("0x6e5fa679211d7f6b54e14e187d34ba547c5d3fe0", signer);
    let sff = TokenV2__factory.connect("0xdf9b4b57865b403e08c85568442f95c26b7896b0", signer);

    console.log("[", signerIndex + 1, "] ", signers[signerIndex].address);
    console.log(moment().format());

    console.log(ethers.utils.formatEther(await sff.balanceOf(signerAddress)), "SFF");
    console.log(ethers.utils.formatEther(await ethers.provider.getBalance(signerAddress)), 'MATIC')

    console.log("===== Lands =====");
    let farm = await farm_v2.getFarm(signerAddress);
    for (const [i, place] of farm.entries()) {
      console.log(
        "Slot ", i,
        "Has fruit: ", fruits[place.fruit].name,
        "Which was planted at: ",moment.unix(place.createdAt.toNumber()).format()
      );
    }

    let now = moment.utc().unix();
    let lastHarvest = Math.max(
      ...farm.map((event) => fruits[event.fruit].harvestTime - (now - event.createdAt.toNumber()))
    );

    if (lastHarvest > 0) {
      console.log("Next farming: ", lastHarvest, "s later");
      harvestTimeArray.push(lastHarvest);
      signerIndex++;
      continue;
    }
    console.log("===== Planting =====");
    let events: EventStruct[] = [];
      for (let i = 0; i < farm.length; i++) {
        console.log("Planting ",fruits[desiredFruit].name, " at slot ", i + 1);
        events.push({
          action: 1,
          createdAt: now,
          fruit: desiredFruit,
          landIndex: i,
        });
        events.push({
          action: 0,
          createdAt: now,
          fruit: desiredFruit,
          landIndex: i,
        });
      }

    let decimals = ethers.BigNumber.from(10).pow(await sff.decimals());
    let fruitPrice = decimals.mul(1000).div((1/fruits[desiredFruit].fruitPrice)*1000); // price * 10**decimals (but BigNum doesn't like decimal < 1)
    let seedPrice = decimals.mul(1000).div((1/fruits[desiredFruit].seedPrice)*1000);
    let marketFruitPrice = await farm_v2.getMarketPrice(fruitPrice);
    let marketSeedPrice = await farm_v2.getMarketPrice(seedPrice);
    let income = marketFruitPrice.mul(farm.length);
    let expense = marketSeedPrice.mul(farm.length);
    let profit = income.sub(expense);
    console.log("Profit:", ethers.utils.formatEther(profit), "SFF");

    console.log("===== Gas =====");
    interface GasStation {
      safeLow: number,
      standard: number,
      fast: number,
      fastest: number,
      blockTime: string,
      blockNumber: string
    }
    let gasStation: GasStation;
    try {
      const { data } = await axios.get("https://gasstation-mainnet.matic.network/");
      gasStation = data;
    } catch (error) {
      console.log(error);
      await delay(waitSeconds * 1000);
      continue;
    }

    console.log("standard gas fee: ", gasStation.standard);

    if (gasStation.standard > gasLimit) {
      console.log("Gas price is too high! (", gasStation.standard, " and our limit is ", gasLimit, ") Trying again in", waitSeconds, "seconds");
      await delay(waitSeconds * 1000);
      continue;
    }

    let gasPrice = ethers.utils.parseUnits(String(gasStation.standard), "gwei");

    try {
      let gas = await farm_v2.estimateGas.sync(events);
      console.log("Estimated gas: ", ethers.utils.formatEther(gas.mul(gasPrice)), "MATIC");

      let syncTransaction = await farm_v2.sync(events, { gasLimit: gas.mul(2), gasPrice: gasPrice });
      console.log("Created transaction: ", syncTransaction);
      let recipient = await syncTransaction.wait();
      console.log(recipient.transactionHash);
      harvestTimeArray.push(fruits[desiredFruit].harvestTime);
    } catch (e) {
      console.log(e);
      await delay(waitSeconds * 1000);
      continue;
    }
    signerIndex = signerIndex + 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
