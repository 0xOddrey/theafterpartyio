// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AfterpartyEventToken - ERC1155 tokens for event attendance
/// @notice Each event gets its own token ID, attendees can mint editions
contract AfterpartyEventToken is ERC1155, Ownable {
    uint256 private _eventIdCounter;
    
    struct Event {
        uint256 tokenId;
        address organizer;
        string uri;
        uint256 totalMinted;
        bool exists;
    }
    
    mapping(uint256 => Event) public events;
    mapping(address => uint256[]) public organizerEvents;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    
    event EventCreated(uint256 indexed eventId, address indexed organizer, string uri);
    event TokenMinted(uint256 indexed eventId, address indexed attendee, uint256 amount);
    
    constructor() ERC1155("") Ownable(msg.sender) {}
    
    /// @notice Create a new event and mint the first token to the organizer
    /// @param eventUri The metadata URI for this event's tokens
    /// @return eventId The ID of the newly created event
    function createEvent(string memory eventUri) external payable returns (uint256) {
        require(msg.value == 0.0001 ether, "Event creation requires 0.0001 ETH");
        _eventIdCounter++;
        uint256 newEventId = _eventIdCounter;
        
        events[newEventId] = Event({
            tokenId: newEventId,
            organizer: msg.sender,
            uri: eventUri,
            totalMinted: 1,
            exists: true
        });
        
        organizerEvents[msg.sender].push(newEventId);
        
        _mint(msg.sender, newEventId, 1, "");
        hasClaimed[newEventId][msg.sender] = true;
        
        emit EventCreated(newEventId, msg.sender, eventUri);
        emit TokenMinted(newEventId, msg.sender, 1);
        
        return newEventId;
    }
    
    /// @notice Get event details by ID
    /// @param eventId The ID of the event
    /// @return Event struct with all event details
    function getEvent(uint256 eventId) external view returns (Event memory) {
        require(events[eventId].exists, "Event does not exist");
        return events[eventId];
    }
    
    /// @notice Mint a token for an event attendee
    /// @param eventId The ID of the event to mint for
    function mintAttendanceToken(uint256 eventId) external {
        require(events[eventId].exists, "Event does not exist");
        require(!hasClaimed[eventId][msg.sender], "Already claimed token for this event");
        
        _mint(msg.sender, eventId, 1, "");
        hasClaimed[eventId][msg.sender] = true;
        events[eventId].totalMinted++;
        
        emit TokenMinted(eventId, msg.sender, 1);
    }
    
    /// @notice Get all events created by an organizer
    /// @param organizer The address of the organizer
    /// @return Array of event IDs
    function getOrganizerEvents(address organizer) external view returns (uint256[] memory) {
        return organizerEvents[organizer];
    }
    
    /// @notice Override URI function to return event-specific URIs
    /// @param tokenId The token ID (event ID)
    /// @return The metadata URI for the token
    function uri(uint256 tokenId) public view override returns (string memory) {
        require(events[tokenId].exists, "Event does not exist");
        return events[tokenId].uri;
    }
    
    /// @notice Withdraw accumulated event creation fees
    /// @dev Only owner can withdraw
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /// @notice Get contract balance
    /// @return The current balance of the contract
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}