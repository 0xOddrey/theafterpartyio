// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Attendance token for event participation
contract AttendanceToken is ERC721, Ownable {
    uint256 public nextTokenId = 1;
    mapping(address => bool) public hasClaimed;

    constructor() ERC721("Attendance Token", "ATTN") Ownable(msg.sender) {}

    function claim(address to) external onlyOwner {
        require(!hasClaimed[to], "Already claimed");
        _mint(to, nextTokenId);
        nextTokenId++;
        hasClaimed[to] = true;
    }
}
