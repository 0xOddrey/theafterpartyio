// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AttendanceToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Simple event contract that issues attendance tokens
contract AfterpartyEvent is Ownable {
    AttendanceToken public attendanceToken;

    /// @notice Deploy a new event and accompanying attendance token
    constructor() Ownable(msg.sender) {
        attendanceToken = new AttendanceToken();
    }

    /// @notice Mint an attendance token for the caller
    function claim() external {
        attendanceToken.claim(msg.sender);
    }
}
