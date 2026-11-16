const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChainProof Contract", function () {
  let supplyChain;
  let admin, producer, inspector, logistics, distributor, unauthorizedUser;

  const PRODUCER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PRODUCER_ROLE"));
  const INSPECTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("INSPECTOR_ROLE"));
  const LOGISTICS_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LOGISTICS_ROLE"));
  const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));

  const batchId = "BATCH-2024-TEST-001";
  const productName = "Xoài Cát Hòa Lộc Tiền Giang";

  const producerHash = ethers.keccak256(ethers.toUtf8Bytes("producer-payload-sample"));
  const inspectorHash = ethers.keccak256(ethers.toUtf8Bytes("inspector-payload-sample"));
  const logisticsHash = ethers.keccak256(ethers.toUtf8Bytes("logistics-payload-sample"));
  const distributorHash = ethers.keccak256(ethers.toUtf8Bytes("distributor-payload-sample"));

  beforeEach(async function () {
    [admin, producer, inspector, logistics, distributor, unauthorizedUser] = await ethers.getSigners();

    const SupplyChainProof = await ethers.getContractFactory("SupplyChainProof");
    supplyChain = await SupplyChainProof.deploy(admin.address);
    await supplyChain.waitForDeployment();

    // Admin grants roles
    await supplyChain.connect(admin).grantRole(PRODUCER_ROLE, producer.address);
    await supplyChain.connect(admin).grantRole(INSPECTOR_ROLE, inspector.address);
    await supplyChain.connect(admin).grantRole(LOGISTICS_ROLE, logistics.address);
    await supplyChain.connect(admin).grantRole(DISTRIBUTOR_ROLE, distributor.address);
  });

  it("Should assign roles correctly", async function () {
    expect(await supplyChain.hasRole(PRODUCER_ROLE, producer.address)).to.be.true;
    expect(await supplyChain.hasRole(INSPECTOR_ROLE, inspector.address)).to.be.true;
    expect(await supplyChain.hasRole(LOGISTICS_ROLE, logistics.address)).to.be.true;
    expect(await supplyChain.hasRole(DISTRIBUTOR_ROLE, distributor.address)).to.be.true;
    expect(await supplyChain.hasRole(PRODUCER_ROLE, unauthorizedUser.address)).to.be.false;

    expect(await supplyChain.getUserRole(admin.address)).to.equal("ADMIN");
    expect(await supplyChain.getUserRole(producer.address)).to.equal("PRODUCER");
    expect(await supplyChain.getUserRole(inspector.address)).to.equal("INSPECTOR");
    expect(await supplyChain.getUserRole(logistics.address)).to.equal("LOGISTICS");
    expect(await supplyChain.getUserRole(distributor.address)).to.equal("DISTRIBUTOR");
    expect(await supplyChain.getUserRole(unauthorizedUser.address)).to.equal("NONE");
  });

  it("Should prevent unauthorized users from recording production", async function () {
    await expect(
      supplyChain.connect(unauthorizedUser).recordProduction(batchId, productName, producerHash)
    ).to.be.reverted;
  });

  it("Should execute full supply chain lifecycle successfully", async function () {
    // 1. Producer records production
    await expect(supplyChain.connect(producer).recordProduction(batchId, productName, producerHash))
      .to.emit(supplyChain, "BatchCreated")
      .withArgs(batchId, productName, producer.address, producerHash, (ts) => ts > 0);

    let batch = await supplyChain.getBatchProof(batchId);
    expect(batch.currentStage).to.equal(0); // Created
    expect(batch.production.dataHash).to.equal(producerHash);
    expect(batch.production.signer).to.equal(producer.address);

    // 2. Inspector records inspection
    await expect(supplyChain.connect(inspector).recordInspection(batchId, inspectorHash))
      .to.emit(supplyChain, "BatchInspected")
      .withArgs(batchId, inspector.address, inspectorHash, (ts) => ts > 0);

    batch = await supplyChain.getBatchProof(batchId);
    expect(batch.currentStage).to.equal(1); // Inspected
    expect(batch.inspection.dataHash).to.equal(inspectorHash);
    expect(batch.inspection.signer).to.equal(inspector.address);

    // 3. Logistics records transport
    await expect(supplyChain.connect(logistics).recordLogistics(batchId, logisticsHash))
      .to.emit(supplyChain, "BatchTransported")
      .withArgs(batchId, logistics.address, logisticsHash, (ts) => ts > 0);

    batch = await supplyChain.getBatchProof(batchId);
    expect(batch.currentStage).to.equal(2); // InTransit
    expect(batch.logistics.dataHash).to.equal(logisticsHash);
    expect(batch.logistics.signer).to.equal(logistics.address);

    // 4. Distributor records delivery
    await expect(supplyChain.connect(distributor).recordDistribution(batchId, distributorHash))
      .to.emit(supplyChain, "BatchDelivered")
      .withArgs(batchId, distributor.address, distributorHash, (ts) => ts > 0);

    batch = await supplyChain.getBatchProof(batchId);
    expect(batch.currentStage).to.equal(3); // Delivered
    expect(batch.distribution.dataHash).to.equal(distributorHash);
    expect(batch.distribution.signer).to.equal(distributor.address);
  });

  it("Should reject out-of-order execution (e.g. Logistics before Inspection)", async function () {
    await supplyChain.connect(producer).recordProduction(batchId, productName, producerHash);

    // Try logistics before inspector
    await expect(
      supplyChain.connect(logistics).recordLogistics(batchId, logisticsHash)
    ).to.be.revertedWith("Batch must be inspected first");
  });
});
