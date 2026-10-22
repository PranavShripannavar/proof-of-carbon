// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Prototype record integrity registry. Caller-supplied scores/cells are NOT attested.
contract ProofOfCarbon {
    uint256 public constant MAX_CELLS = 64;
    uint32 public constant MAX_CELL_ID = 648000000;
    struct Record {
        address owner;
        bytes32 claimHash;
        bytes32 reportHash;
        uint8 score;
        uint16 year;
        uint64 registeredAt;
        bool retired;
    }
    mapping(bytes32 => Record) public records;
    mapping(uint16 => mapping(uint32 => bytes32)) public reservations;
    mapping(bytes32 => uint32[]) private recordCells;
    event ClaimRegistered(bytes32 indexed id, address indexed owner, bytes32 indexed claimHash, bytes32 reportHash, uint8 score, uint16 year, uint32[] cells);
    event ClaimRetired(bytes32 indexed id, address indexed owner);
    error InvalidInput();
    error CellReserved(uint32 cell, uint16 year, bytes32 existing);
    error NotOwner();
    error AlreadyRetired();
    function registerClaim(bytes32 claimHash, bytes32 reportHash, uint8 score, uint16 year, uint32[] calldata cells) external returns(bytes32 id) {
        if (claimHash == bytes32(0) || reportHash == bytes32(0) || score > 100 || year < 2000 || year > 2100 || cells.length == 0 || cells.length > MAX_CELLS) revert InvalidInput();
        id = keccak256(abi.encode(msg.sender, claimHash, reportHash));
        if(records[id].owner != address(0)) revert InvalidInput();
        for(uint256 i; i < cells.length; ++i) {
            if(cells[i] == 0 || cells[i] > MAX_CELL_ID || (i > 0 && cells[i] <= cells[i-1])) revert InvalidInput();
            bytes32 existing = reservations[year][cells[i]];
            if(existing != bytes32(0)) revert CellReserved(cells[i], year, existing);
            reservations[year][cells[i]] = id;
        }
        records[id] = Record(msg.sender,claimHash,reportHash,score,year,uint64(block.timestamp),false);
        recordCells[id] = cells;
        emit ClaimRegistered(id,msg.sender,claimHash,reportHash,score,year,cells);
    }
    function getCells(bytes32 id) external view returns(uint32[] memory) { return recordCells[id]; }
    function retireClaim(bytes32 id) external {
        Record storage r = records[id];
        if(r.owner != msg.sender) revert NotOwner();
        if(r.retired) revert AlreadyRetired();
        r.retired = true;
        emit ClaimRetired(id,msg.sender);
        // Reservations intentionally survive retirement forever for that reporting year.
    }
}
