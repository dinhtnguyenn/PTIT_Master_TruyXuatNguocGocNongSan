const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Current caller (Deployer):", deployer.address);

  const contractAddress = "0x68Af0988167fddD7Eb5CE70485EA41f3A4a582a6";
  const targetAdmin = "0xd308d759F0986aADe715d8B2bf18d58c1680b9CC";

  const SupplyChainProof = await hre.ethers.getContractFactory("SupplyChainProof");
  const contract = SupplyChainProof.attach(contractAddress);

  const DEFAULT_ADMIN_ROLE = hre.ethers.ZeroHash;

  console.log("Checking if target already has DEFAULT_ADMIN_ROLE...");
  const hasAdminBefore = await contract.hasRole(DEFAULT_ADMIN_ROLE, targetAdmin);
  console.log("Target hasAdminBefore:", hasAdminBefore);

  if (!hasAdminBefore) {
    console.log(`Granting DEFAULT_ADMIN_ROLE to ${targetAdmin}...`);
    // Estimate gas and fetch fee data for Amoy
    const feeData = await hre.ethers.provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas ? (feeData.maxFeePerGas * 150n) / 100n : undefined;
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * 150n) / 100n : undefined;

    const tx = await contract.grantRole(DEFAULT_ADMIN_ROLE, targetAdmin, {
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    const receipt = await tx.wait(1);
    console.log("Confirmed in block:", receipt.blockNumber);
  }

  const hasAdminAfter = await contract.hasRole(DEFAULT_ADMIN_ROLE, targetAdmin);
  const roleName = await contract.getUserRole(targetAdmin);
  console.log("Target hasAdminAfter:", hasAdminAfter);
  console.log("Target getUserRole:", roleName);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
