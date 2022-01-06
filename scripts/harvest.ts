import { ethers } from "hardhat";

import { FarmV2__factory, TokenV2__factory } from "../typechain-types";
import moment from "moment";
import { EventStruct } from "../typechain-types/FarmV2";
import axios from "axios";
import 'dotenv/config';
const { fruits } = require('./utils/fruits');

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let signers = await ethers.getSigners();
  let signerIndex = 0;
  let gasLimit = process.env.GAS_LIMIT || 500;
  let desiredFruit = process.env.DESIRED_FRUIT || 2;
  console.log("Your desired fruit is: ",fruits[desiredFruit.toString()].name)
  let harvestTimeArray:number[] = [];

  while (true) {
    if(signerIndex == signers.length){
      let closestHarvestTime = Math.min(...harvestTimeArray.map((n) => n));
      console.log("Reached end of wallet array. waiting for the closest harvest time :", closestHarvestTime);
      harvestTimeArray = [];
      signerIndex = 0;
      await delay(closestHarvestTime * 1000);
    }
    let signer = signers[signerIndex];
    let signerAddress = signer.address;
    let farm_v2 = FarmV2__factory.connect(
      "0x6e5fa679211d7f6b54e14e187d34ba547c5d3fe0",
      signer
    );
    let sff = TokenV2__factory.connect(
      "0xdf9b4b57865b403e08c85568442f95c26b7896b0",
      signer
    );

    console.log(signerIndex + 1, signers[signerIndex].address);
    console.log(moment().format());

    console.log(
      ethers.utils.formatEther(await sff.balanceOf(signerAddress)),
      "SFF"
    );

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
      await delay(1000 * 90);
      continue;
    }

    console.log("standard gas fee: ", gasStation.standard);

    if (gasStation.standard > gasLimit) {
      console.log("Gas price is too high! (", gasStation.standard, " and our limit is ", gasLimit, ") Trying again in 90 seconds");
      await delay(1000 * 90);
      continue;
    }

    let gasPrice = ethers.utils.parseUnits(String(gasStation.standard), "gwei");

    try {
      let gas = await farm_v2.estimateGas.sync(events);
      console.log("Estimated gas: ", ethers.utils.formatEther(gas.mul(gasPrice)), "MATIC");

      let sync = await farm_v2.sync(events, { gasLimit: gas.mul(2), gasPrice: gasPrice });
      console.log("Created transaction: ", sync);
      let recipient = await sync.wait();
      console.log(recipient.transactionHash);
      harvestTimeArray.push(fruits[desiredFruit].harvestTime);
    } catch (e) {
      console.log(e);
      await delay(1000 * 90);
      continue;
    }

    console.log(
      ethers.utils.formatEther(await sff.balanceOf(signerAddress)),
      "SFF"
    );
    signerIndex = signerIndex + 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
