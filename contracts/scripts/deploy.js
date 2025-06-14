async function main() {
  const Example = await ethers.getContractFactory('Example');
  const example = await Example.deploy();
  await example.deployed();
  console.log('Example deployed to:', example.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
