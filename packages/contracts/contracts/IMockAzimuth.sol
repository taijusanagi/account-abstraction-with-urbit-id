// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// this is mock contract of Azimuth

interface IMockAzimuth {
  // to mint Urbit ID
  function faucet(uint256 point, address target) external;

  // to get owner of Urbit ID
  function getOwner(uint256 point) external view returns (address);
}
