// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "../src/ProofOfCarbon.sol";
interface Vm { function prank(address) external; function expectRevert(bytes4) external; function expectRevert(bytes calldata) external; function expectRevert() external; }
contract ProofOfCarbonTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    ProofOfCarbon registry;
    bytes32 constant C = keccak256("claim");
    bytes32 constant R = keccak256("report");
    function setUp() public {registry = new ProofOfCarbon();}
    function cells() internal pure returns(uint32[] memory a){a=new uint32[](2);a[0]=1;a[1]=2;}
    function testRegistration() public {bytes32 id=registry.registerClaim(C,R,70,2025,cells());(address owner,bytes32 claimHash,bytes32 reportHash,uint8 score,uint16 year,uint64 timestamp,bool retired)=registry.records(id);require(owner==address(this)&&claimHash==C&&reportHash==R&&score==70&&year==2025&&timestamp==block.timestamp&&!retired);require(registry.getCells(id).length==2);}
    function testSameYearConflict() public {bytes32 id=registry.registerClaim(C,R,0,2025,cells());vm.expectRevert(abi.encodeWithSelector(ProofOfCarbon.CellReserved.selector,uint32(1),uint16(2025),id));registry.registerClaim(keccak256("other"),R,0,2025,cells());}
    function testDifferentYear() public {registry.registerClaim(C,R,0,2025,cells());registry.registerClaim(C,keccak256("next report"),0,2026,cells());}
    function testOwnerOnly() public {bytes32 id=registry.registerClaim(C,R,0,2025,cells());vm.prank(address(0xbeef));vm.expectRevert(ProofOfCarbon.NotOwner.selector);registry.retireClaim(id);}
    function testRetireRetainsReservations() public {bytes32 id=registry.registerClaim(C,R,0,2025,cells());registry.retireClaim(id);require(registry.reservations(2025,1)==id);vm.expectRevert(ProofOfCarbon.AlreadyRetired.selector);registry.retireClaim(id);vm.expectRevert(abi.encodeWithSelector(ProofOfCarbon.CellReserved.selector,uint32(1),uint16(2025),id));registry.registerClaim(keccak256("new"),R,0,2025,cells());}
    function testInvalidScore() public {vm.expectRevert(ProofOfCarbon.InvalidInput.selector);registry.registerClaim(C,R,101,2025,cells());}
    function testUnsortedAndRepeated() public {uint32[] memory a=cells();a[1]=1;vm.expectRevert(ProofOfCarbon.InvalidInput.selector);registry.registerClaim(C,R,0,2025,a);a[0]=2;vm.expectRevert(ProofOfCarbon.InvalidInput.selector);registry.registerClaim(C,R,0,2025,a);}
    function testInvalidBounds() public {uint32[] memory a=new uint32[](65);vm.expectRevert(ProofOfCarbon.InvalidInput.selector);registry.registerClaim(C,R,0,2025,a);vm.expectRevert(ProofOfCarbon.InvalidInput.selector);registry.registerClaim(C,R,0,1999,cells());a=new uint32[](0);vm.expectRevert(ProofOfCarbon.InvalidInput.selector);registry.registerClaim(C,R,0,2025,a);}
}
