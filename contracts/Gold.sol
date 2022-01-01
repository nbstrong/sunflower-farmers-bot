// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract Gold is ERC20, ERC20Burnable {
    address public minter;

    // How long it takes - 12 hours
    uint256 RECOVERY_SECONDS = 43200;
    // How much gold a goldmine has
    uint256 STRENGTH = 2 * (10**18);

    mapping(address => uint256) recoveryTime;

    event MinterChanged(address indexed from, address to);

    constructor() payable ERC20("Sunflower Land Gold", "SLG") {
        minter = msg.sender;
    }

    function passMinterRole(address farm) public returns (bool) {
        require(msg.sender == minter, "You are not minter");
        minter = farm;

        emit MinterChanged(msg.sender, farm);
        return true;
    }

    // Rewards / Christmas Giveaway
    function premine(address account, uint256 amount) public {
        require(msg.sender == minter, "You are not the minter");
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public {
        require(msg.sender == minter, "You are not the minter");
        _burn(account, amount);
    }

    function getAvailable(address account) public view returns (uint256) {
        uint256 recoveredAt = recoveryTime[account];

        if (block.timestamp > recoveredAt) {
            return STRENGTH;
        }

        // A portion of the resource is available
        uint256 difference = recoveredAt - block.timestamp;
        uint256 secondsRecovered = RECOVERY_SECONDS - difference;

        return (STRENGTH * secondsRecovered) / RECOVERY_SECONDS;
    }

    function getRecoveryTime(address account) public view returns (uint256) {
        return recoveryTime[account];
    }

    function stake(address account, uint256 amount) public {
        require(msg.sender == minter, "You are not the minter");

        uint256 available = getAvailable(account);
        require(available >= amount, "The gold has not replenished");

        uint256 newAvailable = available - amount;
        uint256 amountToRecover = STRENGTH - newAvailable;

        // How long it will take to get back to full strength
        uint256 timeToRecover = (RECOVERY_SECONDS * amountToRecover) / STRENGTH;
        recoveryTime[account] = block.timestamp + timeToRecover;

        // Pseudo random multiplier
        uint256 multiplier = 1;

        // Seconds are even, increase multiplier
        if ((block.timestamp / 10) % 2 == 0) {
            multiplier += 1;
        }

        _mint(account, amount * multiplier);
    }
}
