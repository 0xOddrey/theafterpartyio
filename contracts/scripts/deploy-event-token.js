const hre = require("hardhat");

async function main() {
  const networkName = hre.network.name;
  const chainId = hre.network.config.chainId;
  
  console.log(`Deploying AfterpartyEventToken to ${networkName} (Chain ID: ${chainId})...`);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  // Deploy AfterpartyEventToken
  const AfterpartyEventToken = await hre.ethers.getContractFactory("AfterpartyEventToken");
  const eventToken = await AfterpartyEventToken.deploy();
  
  await eventToken.waitForDeployment();
  
  const contractAddress = await eventToken.getAddress();
  const deployTx = eventToken.deploymentTransaction();
  
  console.log("\n✅ AfterpartyEventToken deployed to:", contractAddress);
  console.log("Transaction hash:", deployTx.hash);
  
  // Wait for a few block confirmations
  console.log("\nWaiting for block confirmations...");
  await deployTx.wait(5);
  
  // Verify the contract on Basescan (if API key is set)
  if (process.env.BASESCAN_API_KEY && process.env.BASESCAN_API_KEY !== "YOUR_BASESCAN_API_KEY") {
    console.log("\nVerifying contract on Basescan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on Basescan");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  } else {
    console.log("\n⚠️  Skipping Basescan verification (no API key set)");
  }
  
  // Log deployment summary
  console.log("\n📋 Deployment Summary:");
  console.log("====================");
  console.log(`Network: ${networkName}`);
  console.log("Contract: AfterpartyEventToken");
  console.log("Address:", contractAddress);
  console.log("Deployer:", deployer.address);
  console.log("\n🎉 Deployment complete!");
  
  // Save deployment info
  const fs = require('fs');
  const receipt = await deployTx.wait();
  const deploymentInfo = {
    network: networkName,
    chainId: chainId,
    contractName: "AfterpartyEventToken",
    contractAddress: contractAddress,
    deployer: deployer.address,
    transactionHash: deployTx.hash,
    blockNumber: receipt.blockNumber,
    timestamp: new Date().toISOString()
  };
  
  const deploymentPath = './deployments';
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath);
  }
  
  const filename = `${networkName}-AfterpartyEventToken.json`;
  fs.writeFileSync(
    `${deploymentPath}/${filename}`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📁 Deployment info saved to:", `${deploymentPath}/${filename}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });