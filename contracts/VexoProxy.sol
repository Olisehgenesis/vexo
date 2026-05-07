// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  VexoProxy
 * @notice ERC-1967 Transparent Upgradeable Proxy for vexoSocial.
 *
 *  Slots (ERC-1967):
 *    implementation : 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
 *    admin          : 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103
 *
 *  Rules:
 *    - Admin callers → proxy management only (upgradeTo, changeAdmin, …)
 *    - All other callers → delegatecall to implementation
 */
contract VexoProxy {
    // keccak256("eip1967.proxy.implementation") - 1
    bytes32 private constant _IMPL_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    // keccak256("eip1967.proxy.admin") - 1
    bytes32 private constant _ADMIN_SLOT =
        0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    event Upgraded(address indexed implementation);
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);

    /**
     * @param _impl   VexoCore implementation address.
     * @param _admin  Proxy admin — the only account that can upgrade.
     * @param _data   Optional calldata delegatecall'd into _impl on deploy
     *                (use this to call initialize()).
     */
    constructor(address _impl, address _admin, bytes memory _data) {
        _setImpl(_impl);
        _setAdmin(_admin);
        if (_data.length > 0) {
            (bool ok, bytes memory err) = _impl.delegatecall(_data);
            if (!ok) {
                if (err.length > 0) {
                    assembly { revert(add(err, 32), mload(err)) }
                }
                revert("VexoProxy: init failed");
            }
        }
    }

    // ── Admin: upgrade & admin management ────────────────────────────────────

    /// @notice Upgrade to a new implementation. Admin only.
    function upgradeTo(address newImpl) external {
        _requireAdmin();
        _setImpl(newImpl);
    }

    /// @notice Upgrade to a new implementation and call an initialiser. Admin only.
    function upgradeToAndCall(address newImpl, bytes calldata data) external {
        _requireAdmin();
        _setImpl(newImpl);
        (bool ok, bytes memory err) = newImpl.delegatecall(data);
        if (!ok) {
            if (err.length > 0) {
                assembly { revert(add(err, 32), mload(err)) }
            }
            revert("VexoProxy: upgrade call failed");
        }
    }

    /// @notice Transfer proxy admin rights. Admin only.
    function changeAdmin(address newAdmin) external {
        _requireAdmin();
        address prev = _getAdmin();
        _setAdmin(newAdmin);
        emit AdminChanged(prev, newAdmin);
    }

    /// @notice Returns current admin. Reverts for non-admin callers.
    function proxyAdmin() external view returns (address) {
        _requireAdmin();
        return _getAdmin();
    }

    /// @notice Returns current implementation. Reverts for non-admin callers.
    function proxyImplementation() external view returns (address) {
        _requireAdmin();
        return _getImpl();
    }

    // ── Fallback: forward everything else to implementation ───────────────────

    fallback() external payable {
        _delegate(_getImpl());
    }

    receive() external payable {
        _delegate(_getImpl());
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _requireAdmin() internal view {
        require(msg.sender == _getAdmin(), "VexoProxy: not admin");
    }

    function _getImpl() internal view returns (address impl) {
        bytes32 slot = _IMPL_SLOT;
        assembly { impl := sload(slot) }
    }

    function _getAdmin() internal view returns (address adm) {
        bytes32 slot = _ADMIN_SLOT;
        assembly { adm := sload(slot) }
    }

    function _setImpl(address impl) internal {
        require(impl.code.length > 0, "VexoProxy: not a contract");
        bytes32 slot = _IMPL_SLOT;
        assembly { sstore(slot, impl) }
        emit Upgraded(impl);
    }

    function _setAdmin(address adm) internal {
        require(adm != address(0), "VexoProxy: zero address");
        bytes32 slot = _ADMIN_SLOT;
        assembly { sstore(slot, adm) }
    }

    function _delegate(address impl) internal {
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0  { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}
