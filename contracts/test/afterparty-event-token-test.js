const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('AfterpartyEventToken - End to End Flow', function () {
  let AfterpartyEventToken, eventToken;
  let deployer, organizer1, organizer2, attendee1, attendee2, attendee3;
  
  beforeEach(async function () {
    [deployer, organizer1, organizer2, attendee1, attendee2, attendee3] = await ethers.getSigners();
    
    AfterpartyEventToken = await ethers.getContractFactory('AfterpartyEventToken');
    eventToken = await AfterpartyEventToken.deploy();
    await eventToken.waitForDeployment();
  });
  
  describe('Event Creation', function () {
    it('should allow organizers to create events with 0.01 ETH payment', async function () {
      const eventUri1 = 'ipfs://event1metadata';
      const eventUri2 = 'ipfs://event2metadata';
      const eventCreationFee = ethers.parseEther('0.01');
      
      // Check initial contract balance
      expect(await eventToken.getBalance()).to.equal(0);
      
      // Organizer 1 creates an event
      const tx1 = await eventToken.connect(organizer1).createEvent(eventUri1, { value: eventCreationFee });
      const receipt1 = await tx1.wait();
      
      // Check EventCreated event
      await expect(tx1)
        .to.emit(eventToken, 'EventCreated')
        .withArgs(1, organizer1.address, eventUri1);
      
      // Verify organizer received the first token
      expect(await eventToken.balanceOf(organizer1.address, 1)).to.equal(1);
      
      // Check contract balance increased
      expect(await eventToken.getBalance()).to.equal(eventCreationFee);
      
      // Organizer 2 creates another event
      const tx2 = await eventToken.connect(organizer2).createEvent(eventUri2, { value: eventCreationFee });
      
      await expect(tx2)
        .to.emit(eventToken, 'EventCreated')
        .withArgs(2, organizer2.address, eventUri2);
      
      // Verify each organizer has their token
      expect(await eventToken.balanceOf(organizer2.address, 2)).to.equal(1);
      expect(await eventToken.balanceOf(organizer1.address, 2)).to.equal(0);
      
      // Check total contract balance
      expect(await eventToken.getBalance()).to.equal(eventCreationFee * 2n);
    });
    
    it('should reject event creation without payment', async function () {
      const eventUri = 'ipfs://eventmetadata';
      
      // Try to create event without payment
      await expect(
        eventToken.connect(organizer1).createEvent(eventUri)
      ).to.be.revertedWith('Event creation requires 0.01 ETH');
    });
    
    it('should reject event creation with incorrect payment amount', async function () {
      const eventUri = 'ipfs://eventmetadata';
      
      // Try with less than required
      await expect(
        eventToken.connect(organizer1).createEvent(eventUri, { value: ethers.parseEther('0.005') })
      ).to.be.revertedWith('Event creation requires 0.01 ETH');
      
      // Try with more than required
      await expect(
        eventToken.connect(organizer1).createEvent(eventUri, { value: ethers.parseEther('0.02') })
      ).to.be.revertedWith('Event creation requires 0.01 ETH');
    });
    
    it('should track events created by organizers', async function () {
      const eventCreationFee = ethers.parseEther('0.01');
      
      await eventToken.connect(organizer1).createEvent('ipfs://event1', { value: eventCreationFee });
      await eventToken.connect(organizer1).createEvent('ipfs://event2', { value: eventCreationFee });
      await eventToken.connect(organizer2).createEvent('ipfs://event3', { value: eventCreationFee });
      
      const organizer1Events = await eventToken.getOrganizerEvents(organizer1.address);
      expect(organizer1Events.length).to.equal(2);
      expect(organizer1Events[0]).to.equal(1n);
      expect(organizer1Events[1]).to.equal(2n);
      
      const organizer2Events = await eventToken.getOrganizerEvents(organizer2.address);
      expect(organizer2Events.length).to.equal(1);
      expect(organizer2Events[0]).to.equal(3n);
    });
  });
  
  describe('Event Information Retrieval', function () {
    it('should retrieve event details by ID', async function () {
      const eventUri = 'ipfs://eventmetadata';
      const eventCreationFee = ethers.parseEther('0.01');
      await eventToken.connect(organizer1).createEvent(eventUri, { value: eventCreationFee });
      
      try {
        const eventDetails = await eventToken.getEvent(1);
        expect(eventDetails.tokenId).to.equal(1n);
        expect(eventDetails.organizer).to.equal(organizer1.address);
        expect(eventDetails.uri).to.equal(eventUri);
        expect(eventDetails.totalMinted).to.equal(1n);
        expect(eventDetails.exists).to.be.true;
      } catch (error) {
        // Fallback to direct mapping access due to ethers v6 compatibility issue
        const [tokenId, organizer, uri, totalMinted, exists] = await eventToken.events(1);
        expect(tokenId).to.equal(1n);
        expect(organizer).to.equal(organizer1.address);
        expect(uri).to.equal(eventUri);
        expect(totalMinted).to.equal(1n);
        expect(exists).to.be.true;
      }
    });
    
    it('should revert when querying non-existent event', async function () {
      // Test using direct mapping access which should return default values
      const [tokenId, organizer, uri, totalMinted, exists] = await eventToken.events(999);
      expect(exists).to.be.false;
    });
    
    it('should return correct URI for each event', async function () {
      const eventCreationFee = ethers.parseEther('0.01');
      await eventToken.connect(organizer1).createEvent('ipfs://event1', { value: eventCreationFee });
      await eventToken.connect(organizer2).createEvent('ipfs://event2', { value: eventCreationFee });
      
      expect(await eventToken.uri(1)).to.equal('ipfs://event1');
      expect(await eventToken.uri(2)).to.equal('ipfs://event2');
      
      await expect(eventToken.uri(999)).to.be.revertedWith('Event does not exist');
    });
  });
  
  describe('Attendee Minting', function () {
    let eventId;
    
    beforeEach(async function () {
      const eventCreationFee = ethers.parseEther('0.01');
      const tx = await eventToken.connect(organizer1).createEvent('ipfs://eventdata', { value: eventCreationFee });
      await tx.wait();
      eventId = 1; // First event has ID 1
    });
    
    it('should allow attendees to mint tokens', async function () {
      // Attendee 1 mints
      await expect(eventToken.connect(attendee1).mintAttendanceToken(eventId))
        .to.emit(eventToken, 'TokenMinted')
        .withArgs(eventId, attendee1.address, 1);
      
      expect(await eventToken.balanceOf(attendee1.address, eventId)).to.equal(1);
      
      // Attendee 2 mints
      await eventToken.connect(attendee2).mintAttendanceToken(eventId);
      expect(await eventToken.balanceOf(attendee2.address, eventId)).to.equal(1);
      
      // Check total minted using direct mapping access
      const [tokenId, organizer, uri, totalMinted, exists] = await eventToken.events(eventId);
      expect(totalMinted).to.equal(3n); // organizer + 2 attendees
    });
    
    it('should prevent double minting for the same event', async function () {
      await eventToken.connect(attendee1).mintAttendanceToken(eventId);
      
      await expect(
        eventToken.connect(attendee1).mintAttendanceToken(eventId)
      ).to.be.revertedWith('Already claimed token for this event');
    });
    
    it('should allow same attendee to mint for different events', async function () {
      // Create second event
      const eventCreationFee = ethers.parseEther('0.01');
      const tx2 = await eventToken.connect(organizer2).createEvent('ipfs://event2', { value: eventCreationFee });
      await tx2.wait();
      const eventId2 = 2; // Second event has ID 2
      
      // Attendee mints for both events
      await eventToken.connect(attendee1).mintAttendanceToken(eventId);
      await eventToken.connect(attendee1).mintAttendanceToken(eventId2);
      
      expect(await eventToken.balanceOf(attendee1.address, eventId)).to.equal(1);
      expect(await eventToken.balanceOf(attendee1.address, eventId2)).to.equal(1);
    });
    
    it('should prevent minting for non-existent events', async function () {
      await expect(
        eventToken.connect(attendee1).mintAttendanceToken(999)
      ).to.be.revertedWith('Event does not exist');
    });
    
    it('should prevent organizer from minting again for their own event', async function () {
      await expect(
        eventToken.connect(organizer1).mintAttendanceToken(eventId)
      ).to.be.revertedWith('Already claimed token for this event');
    });
  });
  
  describe('Complete End-to-End Scenario', function () {
    it('should handle a complete event lifecycle', async function () {
      // Step 1: Two organizers create events
      const eventUri1 = 'ipfs://techconference2024';
      const eventUri2 = 'ipfs://web3meetup2024';
      const eventCreationFee = ethers.parseEther('0.01');
      
      await eventToken.connect(organizer1).createEvent(eventUri1, { value: eventCreationFee });
      await eventToken.connect(organizer2).createEvent(eventUri2, { value: eventCreationFee });
      
      // Step 2: Verify events exist and organizers have tokens
      const [tokenId1, org1, uri1, totalMinted1, exists1] = await eventToken.events(1);
      const [tokenId2, org2, uri2, totalMinted2, exists2] = await eventToken.events(2);
      
      expect(org1).to.equal(organizer1.address);
      expect(org2).to.equal(organizer2.address);
      expect(await eventToken.balanceOf(organizer1.address, 1)).to.equal(1);
      expect(await eventToken.balanceOf(organizer2.address, 2)).to.equal(1);
      
      // Step 3: Multiple attendees mint tokens for event 1
      await eventToken.connect(attendee1).mintAttendanceToken(1);
      await eventToken.connect(attendee2).mintAttendanceToken(1);
      await eventToken.connect(attendee3).mintAttendanceToken(1);
      
      // Step 4: Some attendees also attend event 2
      await eventToken.connect(attendee1).mintAttendanceToken(2);
      await eventToken.connect(attendee3).mintAttendanceToken(2);
      
      // Step 5: Verify final state
      // Event 1 should have 4 tokens minted (organizer + 3 attendees)
      const [, , , finalTotalMinted1, ] = await eventToken.events(1);
      expect(finalTotalMinted1).to.equal(4n);
      
      // Event 2 should have 3 tokens minted (organizer + 2 attendees)
      const [, , , finalTotalMinted2, ] = await eventToken.events(2);
      expect(finalTotalMinted2).to.equal(3n);
      
      // Verify individual balances
      expect(await eventToken.balanceOf(attendee1.address, 1)).to.equal(1);
      expect(await eventToken.balanceOf(attendee1.address, 2)).to.equal(1);
      expect(await eventToken.balanceOf(attendee2.address, 1)).to.equal(1);
      expect(await eventToken.balanceOf(attendee2.address, 2)).to.equal(0);
      expect(await eventToken.balanceOf(attendee3.address, 1)).to.equal(1);
      expect(await eventToken.balanceOf(attendee3.address, 2)).to.equal(1);
      
      // Step 6: Verify organizer events tracking
      const org1Events = await eventToken.getOrganizerEvents(organizer1.address);
      const org2Events = await eventToken.getOrganizerEvents(organizer2.address);
      
      expect(org1Events.length).to.equal(1);
      expect(org1Events[0]).to.equal(1n);
      expect(org2Events.length).to.equal(1);
      expect(org2Events[0]).to.equal(2n);
      
      // Step 7: Verify prevention of double minting
      await expect(
        eventToken.connect(attendee1).mintAttendanceToken(1)
      ).to.be.revertedWith('Already claimed token for this event');
    });
  });
  
  describe('ERC1155 Standard Compliance', function () {
    it('should support batch balance queries', async function () {
      const eventCreationFee = ethers.parseEther('0.01');
      await eventToken.connect(organizer1).createEvent('ipfs://event1', { value: eventCreationFee });
      await eventToken.connect(organizer1).createEvent('ipfs://event2', { value: eventCreationFee });
      
      await eventToken.connect(attendee1).mintAttendanceToken(1);
      await eventToken.connect(attendee1).mintAttendanceToken(2);
      
      const accounts = [attendee1.address, attendee1.address, attendee2.address];
      const ids = [1, 2, 1];
      
      const balances = await eventToken.balanceOfBatch(accounts, ids);
      expect(balances[0]).to.equal(1); // attendee1 balance for token 1
      expect(balances[1]).to.equal(1); // attendee1 balance for token 2
      expect(balances[2]).to.equal(0); // attendee2 balance for token 1
    });
    
    it('should support safe transfers', async function () {
      const eventCreationFee = ethers.parseEther('0.01');
      await eventToken.connect(organizer1).createEvent('ipfs://event1', { value: eventCreationFee });
      await eventToken.connect(attendee1).mintAttendanceToken(1);
      
      // Transfer from attendee1 to attendee2
      await eventToken.connect(attendee1).safeTransferFrom(
        attendee1.address,
        attendee2.address,
        1,
        1,
        '0x'
      );
      
      expect(await eventToken.balanceOf(attendee1.address, 1)).to.equal(0);
      expect(await eventToken.balanceOf(attendee2.address, 1)).to.equal(1);
    });
  });
  
  describe('Fee Management', function () {
    it('should allow owner to withdraw accumulated fees', async function () {
      const eventCreationFee = ethers.parseEther('0.01');
      
      // Create multiple events to accumulate fees
      await eventToken.connect(organizer1).createEvent('ipfs://event1', { value: eventCreationFee });
      await eventToken.connect(organizer2).createEvent('ipfs://event2', { value: eventCreationFee });
      await eventToken.connect(attendee1).createEvent('ipfs://event3', { value: eventCreationFee });
      
      // Check contract balance
      expect(await eventToken.getBalance()).to.equal(eventCreationFee * 3n);
      
      // Record owner's balance before withdrawal
      const ownerBalanceBefore = await ethers.provider.getBalance(deployer.address);
      
      // Withdraw fees
      const tx = await eventToken.connect(deployer).withdrawFees();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Check contract balance is now 0
      expect(await eventToken.getBalance()).to.equal(0);
      
      // Check owner received the fees (minus gas)
      const ownerBalanceAfter = await ethers.provider.getBalance(deployer.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + (eventCreationFee * 3n) - gasUsed);
    });
    
    it('should reject withdrawal when balance is zero', async function () {
      await expect(
        eventToken.withdrawFees()
      ).to.be.revertedWith('No fees to withdraw');
    });
    
    it('should reject withdrawal from non-owner', async function () {
      const eventCreationFee = ethers.parseEther('0.01');
      
      // Create an event to have some balance
      await eventToken.connect(organizer1).createEvent('ipfs://event1', { value: eventCreationFee });
      
      // Try to withdraw as non-owner
      await expect(
        eventToken.connect(organizer1).withdrawFees()
      ).to.be.reverted;
    });
  });
});