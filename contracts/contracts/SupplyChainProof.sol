// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SupplyChainProof
 * @dev Hợp đồng thông minh lưu trữ và xác thực dữ liệu đối soát chuỗi cung ứng nông sản.
 * Tuân thủ phân quyền theo chuẩn AccessControl của OpenZeppelin.
 */
contract SupplyChainProof is AccessControl {
    bytes32 public constant PRODUCER_ROLE = keccak256("PRODUCER_ROLE");
    bytes32 public constant INSPECTOR_ROLE = keccak256("INSPECTOR_ROLE");
    bytes32 public constant LOGISTICS_ROLE = keccak256("LOGISTICS_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    enum Stage {
        Created,    // Đã sản xuất / tạo lô
        Inspected,  // Đã kiểm định chất lượng
        InTransit,  // Đang vận chuyển
        Delivered   // Đã tiếp nhận tại điểm phân phối
    }

    struct StepProof {
        bytes32 dataHash;   // Băm SHA-256 đối chiếu
        address signer;     // Địa chỉ ví chính chủ ký
        uint256 timestamp;  // Thời gian ghi nhận trên blockchain
    }

    struct BatchInfo {
        string batchId;
        Stage currentStage;
        StepProof production;
        StepProof inspection;
        StepProof logistics;
        StepProof distribution;
    }

    mapping(string => BatchInfo) private _batches;
    mapping(string => bool) private _batchExists;

    event BatchCreated(string indexed batchId, address indexed producer, bytes32 dataHash, uint256 timestamp);
    event BatchInspected(string indexed batchId, address indexed inspector, bytes32 dataHash, uint256 timestamp);
    event BatchTransported(string indexed batchId, address indexed logistics, bytes32 dataHash, uint256 timestamp);
    event BatchDelivered(string indexed batchId, address indexed distributor, bytes32 dataHash, uint256 timestamp);

    constructor(address rootAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, rootAdmin);
    }

    /**
     * @notice Producer ghi nhận thông tin sản xuất và khởi tạo lô nông sản
     */
    function recordProduction(
        string calldata batchId,
        bytes32 dataHash
    ) external onlyRole(PRODUCER_ROLE) {
        require(!_batchExists[batchId], "Batch already exists");
        require(bytes(batchId).length > 0, "Batch ID cannot be empty");
        require(dataHash != bytes32(0), "Data hash required");

        BatchInfo storage b = _batches[batchId];
        b.batchId = batchId;
        b.currentStage = Stage.Created;
        b.production = StepProof(dataHash, msg.sender, block.timestamp);

        _batchExists[batchId] = true;
        emit BatchCreated(batchId, msg.sender, dataHash, block.timestamp);
    }

    /**
     * @notice Inspector ghi nhận kết quả kiểm định chất lượng
     */
    function recordInspection(
        string calldata batchId,
        bytes32 dataHash
    ) external onlyRole(INSPECTOR_ROLE) {
        require(_batchExists[batchId], "Batch not found");
        require(dataHash != bytes32(0), "Data hash required");

        BatchInfo storage b = _batches[batchId];
        require(b.currentStage == Stage.Created, "Invalid stage for inspection");

        b.currentStage = Stage.Inspected;
        b.inspection = StepProof(dataHash, msg.sender, block.timestamp);

        emit BatchInspected(batchId, msg.sender, dataHash, block.timestamp);
    }

    /**
     * @notice Logistics ghi nhận thông tin vận chuyển và điều kiện bảo quản
     */
    function recordLogistics(
        string calldata batchId,
        bytes32 dataHash
    ) external onlyRole(LOGISTICS_ROLE) {
        require(_batchExists[batchId], "Batch not found");
        require(dataHash != bytes32(0), "Data hash required");

        BatchInfo storage b = _batches[batchId];
        require(b.currentStage == Stage.Inspected, "Batch must be inspected first");

        b.currentStage = Stage.InTransit;
        b.logistics = StepProof(dataHash, msg.sender, block.timestamp);

        emit BatchTransported(batchId, msg.sender, dataHash, block.timestamp);
    }

    /**
     * @notice Distributor ghi nhận tiếp nhận hàng hóa tại điểm phân phối
     */
    function recordDistribution(
        string calldata batchId,
        bytes32 dataHash
    ) external onlyRole(DISTRIBUTOR_ROLE) {
        require(_batchExists[batchId], "Batch not found");
        require(dataHash != bytes32(0), "Data hash required");

        BatchInfo storage b = _batches[batchId];
        require(b.currentStage == Stage.InTransit, "Batch must be in transit");

        b.currentStage = Stage.Delivered;
        b.distribution = StepProof(dataHash, msg.sender, block.timestamp);

        emit BatchDelivered(batchId, msg.sender, dataHash, block.timestamp);
    }

    /**
     * @notice Lấy thông tin đối chứng của lô hàng (Cho End User & Web tra cứu)
     */
    function getBatchProof(string calldata batchId) external view returns (BatchInfo memory) {
        require(_batchExists[batchId], "Batch not found");
        return _batches[batchId];
    }

    /**
     * @notice Kiểm tra sự tồn tại của lô hàng
     */
    function exists(string calldata batchId) external view returns (bool) {
        return _batchExists[batchId];
    }

    /**
     * @notice Hàm tiện ích kiểm tra vai trò người dùng trả về chuỗi text
     */
    function getUserRole(address account) external view returns (string memory) {
        if (hasRole(DEFAULT_ADMIN_ROLE, account)) return "ADMIN";
        if (hasRole(PRODUCER_ROLE, account)) return "PRODUCER";
        if (hasRole(INSPECTOR_ROLE, account)) return "INSPECTOR";
        if (hasRole(LOGISTICS_ROLE, account)) return "LOGISTICS";
        if (hasRole(DISTRIBUTOR_ROLE, account)) return "DISTRIBUTOR";
        return "NONE";
    }
}
