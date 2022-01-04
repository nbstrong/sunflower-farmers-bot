import { ethers } from "hardhat";

import { FarmV2__factory, TokenV2__factory } from "../typechain-types";
import moment from "moment";
import { EventStruct } from "../typechain-types/FarmV2";
import 'dotenv/config';

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    let signers = await ethers.getSigners();
    let signerIndex = parseInt(process.env.WALLET || "1") - 1;
    let signer = signers[signerIndex];
    let signerAddress = signer.address;
    let farmLenghts:any = {
      1: 5,
      2: 8,
      3: 11,
      4: 14,
      5: 17
    };
    let desiredFarmLevel = process.env.DESIRED_FARM_LEVEL || 1;
    let desiredFruit = process.env.DESIRED_FRUIT || 2;
    let desiredFarmLength = farmLenghts[desiredFarmLevel];
    if(typeof desiredFarmLength == 'undefined') throw `Error: Farm level '${desiredFarmLevel}' is unavailable. Fix on your .env file`;

    let farm_v2 = FarmV2__factory.connect(
        "0x6e5fa679211d7f6b54e14e187d34ba547c5d3fe0",
        signer
    );
    let sff = TokenV2__factory.connect(
        "0xdf9b4b57865b403e08c85568442f95c26b7896b0",
        signer
    );

    console.log(signers[signerIndex].address);

    console.log(
        ethers.utils.formatEther(await sff.balanceOf(signerAddress)),
        "SFF"
    );

    let farm = await farm_v2.getFarm(signerAddress);
    if (farm.length == 0) {
        console.log("Creating farm...");
        let createFarm = await farm_v2.createFarm("0x060697E9d4EEa886EbeCe57A974Facd53A40865B", {value: ethers.utils.parseEther("0.1")});
        console.log((await createFarm.wait()).transactionHash);
        farm = await farm_v2.getFarm(signerAddress);
        console.log("Created farm!");
    }

    while (farm.length < desiredFarmLength) {
        console.log(`Leveling up... ${farm.length} < ${desiredFarmLength}`);
        let levelUp = await farm_v2.levelUp();
        console.log((await levelUp.wait()).transactionHash);
        farm = await farm_v2.getFarm(signerAddress);
        console.log(`Farm Level up!`);
    }

    // refresh farm status
    farm = await farm_v2.getFarm(signerAddress);

    let now = moment.utc().unix();
    let events: EventStruct[] = [];

    for (const [index, slot] of farm.entries()) {
        if (slot.fruit == 0) {
            events.push({
                action: 0,
                createdAt: now,
                fruit: desiredFruit,
                landIndex: index,
            });
        } else if (slot.fruit != 2) {
            events.push({
                action: 1,
                createdAt: now,
                fruit: slot.fruit,
                landIndex: index,
            });
            events.push({
                action: 0,
                createdAt: now,
                fruit: desiredFruit,
                landIndex: index,
            });
        }
    }

    if (events.length == 0) {
        return;
    }

    console.log("Planting potatoes...");
    let gas = await farm_v2.estimateGas.sync(events);
    console.log(ethers.utils.formatUnits(gas.mul(30), "gwei"), "MATIC");

    let sync = await farm_v2.sync(events, { gasLimit: gas.mul(2) });
    let recipient = await sync.wait();
    console.log(recipient.transactionHash);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
