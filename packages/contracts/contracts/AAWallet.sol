// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@account-abstraction/contracts/core/BaseWallet.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "./IMockAzimuth.sol";

// This contract is implemented as ERC4337: account abstraction without Ethereum protocol change
// Also simple social recovery function is implemented

contract AAWallet is BaseWallet {
  using ECDSA for bytes32;
  using UserOperationLib for UserOperation;

  //explicit sizes of nonce, to fit a single storage cell with "owner"
  uint96 private _nonce;

  address azimuth;
  uint256 urbitId;

  function nonce() public view virtual override returns (uint256) {
    return _nonce;
  }

  function entryPoint() public view virtual override returns (IEntryPoint) {
    return _entryPoint;
  }

  IEntryPoint private _entryPoint;

  event EntryPointChanged(address indexed oldEntryPoint, address indexed newEntryPoint);

  // solhint-disable-next-line no-empty-blocks
  receive() external payable {}

  constructor(IEntryPoint anEntryPoint, address _azimuth, uint256 _urbitId) {
    _entryPoint = anEntryPoint;
    azimuth = _azimuth;
    urbitId = _urbitId;
  }

  modifier onlyOwner() {
    _onlyOwner();
    _;
  }

  function owner() public view returns (address) {
    return IMockAzimuth(azimuth).getOwner(urbitId);
  }

  function _onlyOwner() internal view {
    //directly from EOA owner, or through the entryPoint (which gets redirected through execFromEntryPoint)
    require(msg.sender == owner() || msg.sender == address(this), "only owner");
  }

  /**
   * transfer eth value to a destination address
   */
  function transfer(address payable dest, uint256 amount) external onlyOwner {
    dest.transfer(amount);
  }

  /**
   * execute a transaction (called directly from owner, not by entryPoint)
   */
  function exec(address dest, uint256 value, bytes calldata func) external onlyOwner {
    _call(dest, value, func);
  }

  /**
   * execute a sequence of transaction
   */
  function execBatch(address[] calldata dest, bytes[] calldata func) external onlyOwner {
    require(dest.length == func.length, "wrong array lengths");
    for (uint256 i = 0; i < dest.length; i++) {
      _call(dest[i], 0, func[i]);
    }
  }

  /**
   * change entry-point:
   * a wallet must have a method for replacing the entryPoint, in case the the entryPoint is
   * upgraded to a newer version.
   */
  function _updateEntryPoint(address newEntryPoint) internal override {
    emit EntryPointChanged(address(_entryPoint), newEntryPoint);
    _entryPoint = IEntryPoint(payable(newEntryPoint));
  }

  function _requireFromAdmin() internal view override {
    _onlyOwner();
  }

  /**
   * validate the userOp is correct.
   * revert if it doesn't.
   * - must only be called from the entryPoint.
   * - make sure the signature is of our supported signer.
   * - validate current nonce matches request nonce, and increment it.
   * - pay prefund, in case current deposit is not enough
   */
  function _requireFromEntryPoint() internal view override {
    require(msg.sender == address(entryPoint()), "wallet: not from EntryPoint");
  }

  // called by entryPoint, only after validateUserOp succeeded.
  function execFromEntryPoint(address dest, uint256 value, bytes calldata func) external {
    _requireFromEntryPoint();
    _call(dest, value, func);
  }

  /// implement template method of BaseWallet
  function _validateAndUpdateNonce(UserOperation calldata userOp) internal override {
    require(_nonce++ == userOp.nonce, "wallet: invalid nonce");
  }

  /// implement template method of BaseWallet
  function _validateSignature(
    UserOperation calldata userOp,
    bytes32 requestId,
    address
  ) internal view virtual override {
    bytes32 hash = requestId.toEthSignedMessageHash();
    require(owner() == hash.recover(userOp.signature), "wallet: wrong signature");
  }

  function _call(address target, uint256 value, bytes memory data) internal {
    (bool success, bytes memory result) = target.call{value: value}(data);
    if (!success) {
      assembly {
        revert(add(result, 32), mload(result))
      }
    }
  }

  /**
   * check current wallet deposit in the entryPoint
   */
  function getDeposit() public view returns (uint256) {
    return entryPoint().balanceOf(address(this));
  }

  /**
   * deposit more funds for this wallet in the entryPoint
   */
  function addDeposit() public payable {
    (bool req, ) = address(entryPoint()).call{value: msg.value}("");
    require(req);
  }

  /**
   * withdraw value from the wallet's deposit
   * @param withdrawAddress target to send to
   * @param amount to withdraw
   */
  function withdrawDepositTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
    entryPoint().withdrawTo(withdrawAddress, amount);
  }
}
