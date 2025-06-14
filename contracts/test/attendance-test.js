const { expect } = require('chai');

describe('AfterpartyEvent and AttendanceToken', function () {
  let Event, AttendanceToken, event, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    Event = await ethers.getContractFactory('AfterpartyEvent');
    event = await Event.deploy();
    await event.waitForDeployment();
    AttendanceToken = await ethers.getContractAt('AttendanceToken', await event.attendanceToken());
  });

  it('allows a user to claim once', async function () {
    await event.connect(user).claim();
    expect(await AttendanceToken.balanceOf(user.address)).to.equal(1);
    await expect(event.connect(user).claim()).to.be.revertedWith('Already claimed');
  });

  it('only event contract can mint', async function () {
    await expect(AttendanceToken.connect(user).claim(user.address))
      .to.be.revertedWithCustomError(AttendanceToken, 'OwnableUnauthorizedAccount')
      .withArgs(user.address);
  });
});
