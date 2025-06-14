const { expect } = require('chai');

describe('Example', function () {
  it('Should return the correct greeting', async function () {
    const Example = await ethers.getContractFactory('Example');
    const example = await Example.deploy();
    await example.waitForDeployment();

    expect(await example.greet()).to.equal('Hello Afterparty');
  });
});
