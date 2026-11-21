const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("--------------------------------------------------");
  console.log("Deploying SupplyChainProof with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH/POL");

  const feeData = await hre.ethers.provider.getFeeData();
  const maxPriorityFeePerGas = hre.ethers.parseUnits("35", "gwei");
  const maxFeePerGas = feeData.maxFeePerGas
    ? (feeData.maxFeePerGas * 180n) / 100n + maxPriorityFeePerGas
    : hre.ethers.parseUnits("80", "gwei");

  const SupplyChainProof = await hre.ethers.getContractFactory("SupplyChainProof");
  const supplyChain = await SupplyChainProof.deploy(deployer.address, {
    maxPriorityFeePerGas,
    maxFeePerGas,
  });
  console.log("Deployment transaction sent... waiting for confirmation");
  await supplyChain.waitForDeployment();

  const contractAddress = await supplyChain.getAddress();
  console.log("SupplyChainProof deployed successfully to:", contractAddress);
  console.log("--------------------------------------------------");

  // Tự động cấp DEFAULT_ADMIN_ROLE cho ví Admin hệ thống (0xd308d759F0986aADe715d8B2bf18d58c1680b9CC)
  const targetAdmin = "0xd308d759F0986aADe715d8B2bf18d58c1680b9CC";
  const DEFAULT_ADMIN_ROLE = hre.ethers.ZeroHash;
  if (deployer.address.toLowerCase() !== targetAdmin.toLowerCase()) {
    console.log(`Granting DEFAULT_ADMIN_ROLE to primary admin ${targetAdmin}...`);
    try {
      const feeData = await hre.ethers.provider.getFeeData();
      const maxFeePerGas = feeData.maxFeePerGas ? (feeData.maxFeePerGas * 150n) / 100n : undefined;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * 150n) / 100n : undefined;
      const tx = await supplyChain.grantRole(DEFAULT_ADMIN_ROLE, targetAdmin, {
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      console.log("Grant admin tx:", tx.hash);
      await tx.wait(1);
      console.log("Successfully granted DEFAULT_ADMIN_ROLE to:", targetAdmin);
    } catch (e) {
      console.warn("Could not auto-grant admin role:", e.message);
    }
  }

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

  // Also save directly to frontend/src/lib/contract-deployment.json
  const frontendLibDir = path.join(__dirname, "../../frontend/src/lib");
  if (fs.existsSync(frontendLibDir)) {
    fs.writeFileSync(
      path.join(frontendLibDir, "contract-deployment.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("Deployment details saved to frontend/src/lib/contract-deployment.json");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
