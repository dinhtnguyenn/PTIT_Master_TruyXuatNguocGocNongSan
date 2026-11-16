const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("--------------------------------------------------");
  console.log("Deploying SupplyChainProof with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH/POL");

  const SupplyChainProof = await hre.ethers.getContractFactory("SupplyChainProof");
  const supplyChain = await SupplyChainProof.deploy(deployer.address);
  await supplyChain.waitForDeployment();

  const contractAddress = await supplyChain.getAddress();
  console.log("SupplyChainProof deployed successfully to:", contractAddress);
  console.log("--------------------------------------------------");

  // Export contract deployment info for Backend & Frontend
  const deploymentInfo = {
    contractAddress,
    adminAddress: deployer.address,
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    abi: JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../artifacts/contracts/SupplyChainProof.sol/SupplyChainProof.json"),
        "utf8"
      )
    ).abi,
  };

  const sharedDir = path.join(__dirname, "../../shared");
  if (!fs.existsSync(sharedDir)) {
    fs.mkdirSync(sharedDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(sharedDir, "contract-deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("Deployment details saved to shared/contract-deployment.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
