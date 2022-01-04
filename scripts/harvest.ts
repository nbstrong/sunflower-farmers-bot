import { ethers } from "hardhat";

import { FarmV2__factory, TokenV2__factory } from "../typechain-types";
import moment from "moment";
import { EventStruct } from "../typechain-types/FarmV2";
import axios from "axios";
import 'dotenv/config';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let signers = await ethers.getSigners();
  let signerIndex = parseInt(process.env.WALLET || "1") - 1;
  let signer = signers[signerIndex];
  let signerAddress = signer.address;
  let desiredFruit = process.env.DESIRED_FRUIT || 2;

  while (true) {
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
        i,
        place.fruit,
        moment.unix(place.createdAt.toNumber()).format()
      );
    }

    let lastHarvest = Math.max(
      ...farm.map((event) => event.createdAt.toNumber())
    );
    let now = moment.utc().unix();
    let diff = now - lastHarvest;

    if (diff < 30 * 60) {
      console.log("Next farming: ", 30 * 60 - diff, "s later");
      await delay(30 * 60 - diff + 30);
      continue;
    }

    let start = now - 1500;
    let events: EventStruct[] = [];
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < farm.length; i++) {
        events.push({
          action: 1,
          createdAt: start + j * 300,
          fruit: desiredFruit,
          landIndex: i,
        });
        events.push({
          action: 0,
          createdAt: start + j * 300,
          fruit: desiredFruit,
          landIndex: i,
        });
      }
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

    if (gasStation.standard > 50) {
      console.log("Gas price is too high!");
      await delay(1000 * 90);
      continue;
    }

    let gasPrice = ethers.utils.parseUnits(String(gasStation.safeLow), "gwei");

    try {
      let gas = await farm_v2.estimateGas.sync(events);
      console.log(ethers.utils.formatEther(gas.mul(gasPrice)), "MATIC");

      let sync = await farm_v2.sync(events, { gasLimit: gas.mul(2), gasPrice: gasPrice });
      let recipient = await sync.wait();
      console.log(recipient.transactionHash);
    } catch (e) {
      console.log(e);
      await delay(1000 * 90);
      continue;
    }

    console.log(
      ethers.utils.formatEther(await sff.balanceOf(signerAddress)),
      "SFF"
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
