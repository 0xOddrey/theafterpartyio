const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AfterpartyEventToken to Base Mainnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  // Check if we have enough ETH for deployment
  const minBalance = hre.ethers.parseEther("0.005"); // Minimum 0.005 ETH for deployment
  if (balance < minBalance) {
    throw new Error("Insufficient ETH balance for deployment. Need at least 0.005 ETH");
  }
  
  // Deploy AfterpartyEventToken
  console.log("\nDeploying AfterpartyEventToken contract...");
  const AfterpartyEventToken = await hre.ethers.getContractFactory("AfterpartyEventToken");
  
  // Estimate gas for deployment
  const deploymentData = AfterpartyEventToken.getDeployTransaction();
  const gasEstimate = await hre.ethers.provider.estimateGas(deploymentData);
  console.log("Estimated gas for deployment:", gasEstimate.toString());
  
  const eventToken = await AfterpartyEventToken.deploy();
  
  await eventToken.waitForDeployment();
  
  const contractAddress = await eventToken.getAddress();
  const deployTx = eventToken.deploymentTransaction();
  
  console.log("\n✅ AfterpartyEventToken deployed to:", contractAddress);
  console.log("Transaction hash:", deployTx.hash);
  console.log("Gas used:", deployTx.gasLimit?.toString());
  
  // Wait for block confirmations
  console.log("\nWaiting for 10 block confirmations...");
  const receipt = await deployTx.wait(10);
  console.log("✅ Confirmed in block:", receipt.blockNumber);
  
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
  
  // Test basic contract functionality
  console.log("\n🧪 Testing basic contract functionality...");
  try {
    // Get the current event counter (should be 0)
    const currentCounter = await eventToken._eventIdCounter();
    console.log("Current event counter:", currentCounter.toString());
    
    // Check contract balance (should be 0)
    const contractBalance = await eventToken.getBalance();
    console.log("Contract balance:", hre.ethers.formatEther(contractBalance), "ETH");
    
    console.log("✅ Basic contract tests passed");
  } catch (error) {
    console.log("❌ Contract test failed:", error.message);
  }
  
  // Log deployment summary
  console.log("\n📋 Deployment Summary:");
  console.log("====================");
  console.log("Network: Base Mainnet");
  console.log("Chain ID: 8453");
  console.log("Contract: AfterpartyEventToken");
  console.log("Address:", contractAddress);
  console.log("Deployer:", deployer.address);
  console.log("Block Number:", receipt.blockNumber);
  console.log("Gas Used:", receipt.gasUsed?.toString());
  console.log("Effective Gas Price:", receipt.gasPrice?.toString());
  
  // Calculate deployment cost
  const deploymentCost = receipt.gasUsed * receipt.gasPrice;
  console.log("Deployment Cost:", hre.ethers.formatEther(deploymentCost), "ETH");
  
  console.log("\n🎉 Base Mainnet deployment complete!");
  console.log("🔗 View on Basescan:", `https://basescan.org/address/${contractAddress}`);
  
  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: "base-mainnet",
    chainId: 8453,
    contractName: "AfterpartyEventToken",
    contractAddress: contractAddress,
    deployer: deployer.address,
    transactionHash: deployTx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed?.toString(),
    gasPrice: receipt.gasPrice?.toString(),
    deploymentCost: hre.ethers.formatEther(deploymentCost),
    timestamp: new Date().toISOString(),
    basescanUrl: `https://basescan.org/address/${contractAddress}`
  };
  
  const deploymentPath = './deployments';
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath);
  }
  
  fs.writeFileSync(
    `${deploymentPath}/base-mainnet-AfterpartyEventToken.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📁 Deployment info saved to:", `${deploymentPath}/base-mainnet-AfterpartyEventToken.json`);
  
  // Output environment variables for frontend
  console.log("\n🔧 Environment Variables for Frontend:");
  console.log("=====================================");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=8453`);
  console.log(`NEXT_PUBLIC_CHAIN_NAME="Base"`);
  console.log(`NEXT_PUBLIC_RPC_URL="https://mainnet.base.org"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });