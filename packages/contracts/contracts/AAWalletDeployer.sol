// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AAWallet.sol";

import "@openzeppelin/contracts/utils/Create2.sol";

contract AAWalletDeployer {
  function deployWallet(
    IEntryPoint entryPoint,
    address _azimuth,
    uint256 _orbitId,
    uint256 salt
  ) public returns (AAWallet) {
    return new AAWallet{salt: bytes32(salt)}(entryPoint, _azimuth, _orbitId);
  }

  // this is helper function for rapid development
  function getCreate2Address(IEntryPoint entryPoint, address owner, uint256 salt) public view returns (address) {
    bytes memory creationCode = type(AAWallet).creationCode;
    bytes memory initCode = abi.encodePacked(creationCode, abi.encode(entryPoint, owner));
    bytes32 initCodeHash = keccak256(initCode);
    return Create2.computeAddress(bytes32(salt), initCodeHash, address(this));
  }
}
