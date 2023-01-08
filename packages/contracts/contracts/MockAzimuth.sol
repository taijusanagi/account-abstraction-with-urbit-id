// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// this is mock contract of Azimuth

contract MockAzimuth is ERC721 {
  constructor() ERC721("MockAzimuth", "MA") {}

  // to mint Urbit ID
  function faucet(uint256 point, address target) public {
    _mint(target, point);
  }

  // to get owner of Urbit ID
  function getOwner(uint256 point) public view returns (address) {
    return ownerOf(point);
  }
}
