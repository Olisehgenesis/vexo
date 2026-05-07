// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title VexoCore — Decentralized Identity + Social Layer for vexoSocial Protocol
/// @notice Manages soulbound profiles, usernames, social graph, groups, and guardian recovery.
///         Identity is NOT the wallet. profileId is the permanent identity; wallet is the current key.
///
/// @dev    Designed to be deployed behind VexoProxy (ERC-1967). Call initialize() once via the
///         proxy constructor instead of relying on Solidity storage defaults, which are set in the
///         implementation's own storage and are NOT reflected in the proxy's storage.
contract VexoCore {
    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZER  (replaces constructor for proxy-safe deployment)
    // ═══════════════════════════════════════════════════════════════════════════

    address public owner;
    bool private _initialized;
    /// @notice One-time initialiser called via VexoProxy's constructor delegatecall.
    ///         Sets storage values that Solidity would normally set at declaration time
    ///         (those defaults are in the *implementation* storage, not the proxy's).
    function initialize(address _owner) external {
        require(!_initialized, "vexoSocial: already initialized");
        require(_owner != address(0), "vexoSocial: zero owner");
        _initialized  = true;
        owner         = _owner;
        nextProfileId = 1;
        nextGroupId   = 1;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "vexoSocial: not owner");
        _;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // PROFILE  (soulbound — transfers only via recovery)
    // ═══════════════════════════════════════════════════════════════════════════

    uint256 public nextProfileId;

    /// profileId → current owner wallet
    mapping(uint256 => address) public ownerOf;
    /// wallet → profileId (0 = no profile)
    mapping(address => uint256) public profileOf;

    event ProfileCreated(uint256 indexed profileId, address indexed owner);

    function createProfile() external returns (uint256 profileId) {
        require(profileOf[msg.sender] == 0, "vexoSocial: already has profile");
        profileId = nextProfileId++;
        ownerOf[profileId] = msg.sender;
        profileOf[msg.sender] = profileId;
        emit ProfileCreated(profileId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // USERNAME  (@handle layer)
    // ═══════════════════════════════════════════════════════════════════════════

    /// keccak256(username) → profileId (for uniqueness)
    mapping(bytes32 => uint256) public usernameHashToProfile;
    /// profileId → username string
    mapping(uint256 => string) public usernameOf;

    event UsernameSet(uint256 indexed profileId, string username);

    function setUsername(string calldata username) external {
        uint256 profileId = profileOf[msg.sender];
        require(profileId != 0, "vexoSocial: no profile");
        require(bytes(username).length >= 3, "vexoSocial: username too short");
        require(bytes(username).length <= 32, "vexoSocial: username too long");

        bytes32 hash = keccak256(bytes(username));
        uint256 existing = usernameHashToProfile[hash];
        require(existing == 0 || existing == profileId, "vexoSocial: username taken");

        // Release old username hash
        string memory oldName = usernameOf[profileId];
        if (bytes(oldName).length > 0) {
            usernameHashToProfile[keccak256(bytes(oldName))] = 0;
        }

        usernameHashToProfile[hash] = profileId;
        usernameOf[profileId] = username;
        emit UsernameSet(profileId, username);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SOCIAL GRAPH  (friend requests + friends)
    // ═══════════════════════════════════════════════════════════════════════════

    mapping(uint256 => mapping(uint256 => bool)) public isFriend;
    mapping(uint256 => mapping(uint256 => bool)) public hasSentRequest;

    // Enumerable arrays for UI reads
    mapping(uint256 => uint256[]) private _friends;
    mapping(uint256 => uint256[]) private _outgoingRequests;
    mapping(uint256 => uint256[]) private _incomingRequests;

    event FriendRequestSent(uint256 indexed from, uint256 indexed to);
    event FriendAccepted(uint256 indexed profileId, uint256 indexed friendId);
    event FriendRemoved(uint256 indexed profileId, uint256 indexed friendId);
    event FriendRequestRejected(uint256 indexed by, uint256 indexed fromProfileId);

    function sendFriendRequest(uint256 toProfileId) external {
        uint256 myId = profileOf[msg.sender];
        require(myId != 0, "vexoSocial: no profile");
        require(toProfileId != myId, "vexoSocial: cannot friend yourself");
        require(ownerOf[toProfileId] != address(0), "vexoSocial: profile not found");
        require(!isFriend[myId][toProfileId], "vexoSocial: already friends");
        require(!hasSentRequest[myId][toProfileId], "vexoSocial: request already sent");

        hasSentRequest[myId][toProfileId] = true;
        _outgoingRequests[myId].push(toProfileId);
        _incomingRequests[toProfileId].push(myId);
        emit FriendRequestSent(myId, toProfileId);
    }

    function acceptFriendRequest(uint256 fromProfileId) external {
        uint256 myId = profileOf[msg.sender];
        require(myId != 0, "vexoSocial: no profile");
        require(hasSentRequest[fromProfileId][myId], "vexoSocial: no pending request");

        hasSentRequest[fromProfileId][myId] = false;
        _removeFromArray(_outgoingRequests[fromProfileId], myId);
        _removeFromArray(_incomingRequests[myId], fromProfileId);

        isFriend[myId][fromProfileId] = true;
        isFriend[fromProfileId][myId] = true;
        _friends[myId].push(fromProfileId);
        _friends[fromProfileId].push(myId);
        emit FriendAccepted(myId, fromProfileId);
    }

    function rejectFriendRequest(uint256 fromProfileId) external {
        uint256 myId = profileOf[msg.sender];
        require(myId != 0, "vexoSocial: no profile");
        require(hasSentRequest[fromProfileId][myId], "vexoSocial: no pending request");

        hasSentRequest[fromProfileId][myId] = false;
        _removeFromArray(_outgoingRequests[fromProfileId], myId);
        _removeFromArray(_incomingRequests[myId], fromProfileId);
        emit FriendRequestRejected(myId, fromProfileId);
    }

    function removeFriend(uint256 friendId) external {
        uint256 myId = profileOf[msg.sender];
        require(myId != 0, "vexoSocial: no profile");
        require(isFriend[myId][friendId], "vexoSocial: not friends");

        isFriend[myId][friendId] = false;
        isFriend[friendId][myId] = false;
        _removeFromArray(_friends[myId], friendId);
        _removeFromArray(_friends[friendId], myId);
        emit FriendRemoved(myId, friendId);
    }

    function getFriends(uint256 profileId) external view returns (uint256[] memory) {
        return _friends[profileId];
    }

    function getOutgoingRequests(uint256 profileId) external view returns (uint256[] memory) {
        return _outgoingRequests[profileId];
    }

    function getIncomingRequests(uint256 profileId) external view returns (uint256[] memory) {
        return _incomingRequests[profileId];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GROUPS  (Open / Public / Private access model)
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  accessType:
    //    0 = OPEN    — anyone joins instantly (permissionless)
    //    1 = PUBLIC  — join request → admin approval required
    //    2 = PRIVATE — invite-only, only admins can add members

    uint256 public nextGroupId;

    struct Group {
        uint256 id;
        uint256 ownerProfileId;
        string  name;
        uint8   accessType; // 0=OPEN, 1=PUBLIC, 2=PRIVATE
    }

    mapping(uint256 => Group) private _groups;

    /// profileId is a member
    mapping(uint256 => mapping(uint256 => bool)) public isGroupMember;
    /// profileId is an admin (owner is always admin)
    mapping(uint256 => mapping(uint256 => bool)) public isGroupAdmin;
    /// pending join request (PUBLIC groups only)
    mapping(uint256 => mapping(uint256 => bool)) public joinRequests;

    mapping(uint256 => uint256[]) private _groupMembers;
    mapping(uint256 => uint256[]) private _profileGroups;
    mapping(uint256 => uint256[]) private _pendingMembers;

    event GroupCreated(
        uint256 indexed groupId,
        uint256 indexed ownerProfileId,
        string  name,
        uint8   accessType
    );
    event MemberAdded(uint256 indexed groupId, uint256 indexed profileId);
    event MemberRemoved(uint256 indexed groupId, uint256 indexed profileId);
    event JoinRequested(uint256 indexed groupId, uint256 indexed profileId);
    event JoinApproved(uint256 indexed groupId, uint256 indexed profileId);
    event JoinRejected(uint256 indexed groupId, uint256 indexed profileId);
    event AdminAdded(uint256 indexed groupId, uint256 indexed profileId);

    // ─── Create ────────────────────────────────────────────────────────────────

    /// @param accessType 0=OPEN, 1=PUBLIC, 2=PRIVATE
    function createGroup(string calldata name, uint8 accessType)
        external
        returns (uint256 groupId)
    {
        uint256 myId = profileOf[msg.sender];
        require(myId != 0, "vexoSocial: no profile");
        require(bytes(name).length > 0 && bytes(name).length <= 64, "vexoSocial: invalid group name");
        require(accessType <= 2, "vexoSocial: invalid access type");

        groupId = nextGroupId++;
        _groups[groupId] = Group(groupId, myId, name, accessType);
        isGroupMember[groupId][myId] = true;
        isGroupAdmin[groupId][myId] = true;
        _groupMembers[groupId].push(myId);
        _profileGroups[myId].push(groupId);
        emit GroupCreated(groupId, myId, name, accessType);
    }

    // ─── Join ──────────────────────────────────────────────────────────────────

    /// Unified join function.
    ///  - OPEN    → instant membership
    ///  - PUBLIC  → stores a join request for admin approval
    ///  - PRIVATE → reverts (use inviteToGroup)
    function joinGroup(uint256 groupId) external {
        uint256 myId = profileOf[msg.sender];
        require(myId != 0, "vexoSocial: no profile");
        require(_groups[groupId].id != 0, "vexoSocial: group not found");
        require(!isGroupMember[groupId][myId], "vexoSocial: already a member");

        uint8 at = _groups[groupId].accessType;

        if (at == 0) {
            // OPEN — instant join
            _addMember(groupId, myId);
        } else if (at == 1) {
            // PUBLIC — request
            require(!joinRequests[groupId][myId], "vexoSocial: request already pending");
            joinRequests[groupId][myId] = true;
            _pendingMembers[groupId].push(myId);
            emit JoinRequested(groupId, myId);
        } else {
            // PRIVATE
            revert("vexoSocial: invite-only group");
        }
    }

    // ─── Admin: approve / reject / invite ─────────────────────────────────────

    function approveJoinRequest(uint256 groupId, uint256 profileId) external {
        uint256 myId = profileOf[msg.sender];
        require(isGroupAdmin[groupId][myId], "vexoSocial: not group admin");
        require(joinRequests[groupId][profileId], "vexoSocial: no pending request");

        joinRequests[groupId][profileId] = false;
        _removeFromArray(_pendingMembers[groupId], profileId);
        _addMember(groupId, profileId);
        emit JoinApproved(groupId, profileId);
    }

    function rejectJoinRequest(uint256 groupId, uint256 profileId) external {
        uint256 myId = profileOf[msg.sender];
        require(isGroupAdmin[groupId][myId], "vexoSocial: not group admin");
        require(joinRequests[groupId][profileId], "vexoSocial: no pending request");

        joinRequests[groupId][profileId] = false;
        _removeFromArray(_pendingMembers[groupId], profileId);
        emit JoinRejected(groupId, profileId);
    }

    /// Admin invites a profile directly (PRIVATE groups or any access type)
    function inviteToGroup(uint256 groupId, uint256 profileId) external {
        uint256 myId = profileOf[msg.sender];
        require(isGroupAdmin[groupId][myId], "vexoSocial: not group admin");
        require(ownerOf[profileId] != address(0), "vexoSocial: profile not found");
        require(!isGroupMember[groupId][profileId], "vexoSocial: already a member");

        _addMember(groupId, profileId);
    }

    function addGroupAdmin(uint256 groupId, uint256 profileId) external {
        uint256 myId = profileOf[msg.sender];
        require(_groups[groupId].ownerProfileId == myId, "vexoSocial: not group owner");
        require(isGroupMember[groupId][profileId], "vexoSocial: not a member");

        isGroupAdmin[groupId][profileId] = true;
        emit AdminAdded(groupId, profileId);
    }

    function removeGroupMember(uint256 groupId, uint256 profileId) external {
        uint256 myId = profileOf[msg.sender];
        require(
            isGroupAdmin[groupId][myId] || myId == profileId,
            "vexoSocial: not authorized"
        );
        require(isGroupMember[groupId][profileId], "vexoSocial: not a member");

        isGroupMember[groupId][profileId] = false;
        isGroupAdmin[groupId][profileId] = false;
        _removeFromArray(_groupMembers[groupId], profileId);
        _removeFromArray(_profileGroups[profileId], groupId);
        emit MemberRemoved(groupId, profileId);
    }

    // ─── Views ─────────────────────────────────────────────────────────────────

    function getGroup(uint256 groupId)
        external
        view
        returns (
            uint256 id,
            uint256 ownerProfileId,
            string memory name,
            uint8 accessType
        )
    {
        Group storage g = _groups[groupId];
        return (g.id, g.ownerProfileId, g.name, g.accessType);
    }

    function getGroupMembers(uint256 groupId) external view returns (uint256[] memory) {
        return _groupMembers[groupId];
    }

    function getPendingMembers(uint256 groupId) external view returns (uint256[] memory) {
        return _pendingMembers[groupId];
    }

    function getProfileGroups(uint256 profileId) external view returns (uint256[] memory) {
        return _profileGroups[profileId];
    }

    // ─── Internal ──────────────────────────────────────────────────────────────

    function _addMember(uint256 groupId, uint256 profileId) internal {
        isGroupMember[groupId][profileId] = true;
        _groupMembers[groupId].push(profileId);
        _profileGroups[profileId].push(groupId);
        emit MemberAdded(groupId, profileId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GUARDIAN RECOVERY
    // ═══════════════════════════════════════════════════════════════════════════
    //
    // Flow:
    //   1. User sets guardians + threshold via setGuardians()
    //   2. A guardian calls initiateRecovery(profileId, newWallet)
    //   3. Other guardians call approveRecovery(profileId)
    //   4. On threshold met → identity ownership transfers to newWallet
    //      (wallet changes, profileId stays constant)

    struct RecoveryRequest {
        address newWallet;
        uint256 approvals;
        bool executed;
    }

    mapping(uint256 => uint256[]) private _guardians;
    mapping(uint256 => uint256) public recoveryThreshold;
    mapping(uint256 => RecoveryRequest) private _recoveryRequests;
    mapping(uint256 => mapping(uint256 => bool)) public recoveryApproved;

    event GuardiansSet(uint256 indexed profileId, uint256 threshold);
    event RecoveryInitiated(uint256 indexed profileId, address newWallet);
    event RecoveryApproved(uint256 indexed profileId, uint256 indexed guardianId);
    event RecoveryExecuted(
        uint256 indexed profileId,
        address indexed oldWallet,
        address indexed newWallet
    );

    function setGuardians(uint256[] calldata guardianProfileIds, uint256 threshold) external {
        uint256 myId = profileOf[msg.sender];
        require(myId != 0, "vexoSocial: no profile");
        require(
            threshold > 0 && threshold <= guardianProfileIds.length,
            "vexoSocial: invalid threshold"
        );
        _guardians[myId] = guardianProfileIds;
        recoveryThreshold[myId] = threshold;
        emit GuardiansSet(myId, threshold);
    }

    function getGuardians(uint256 profileId)
        external
        view
        returns (uint256[] memory guardians, uint256 threshold)
    {
        return (_guardians[profileId], recoveryThreshold[profileId]);
    }

    function initiateRecovery(uint256 profileId, address newWallet) external {
        uint256 myId = profileOf[msg.sender];
        require(myId != 0, "vexoSocial: no profile");
        require(newWallet != address(0), "vexoSocial: invalid wallet");
        require(!_recoveryRequests[profileId].executed, "vexoSocial: already executed");
        require(_isGuardian(profileId, myId), "vexoSocial: not a guardian");

        if (_recoveryRequests[profileId].newWallet != newWallet) {
            delete _recoveryRequests[profileId];
            _recoveryRequests[profileId].newWallet = newWallet;
        }
        emit RecoveryInitiated(profileId, newWallet);
    }

    function approveRecovery(uint256 profileId) external {
        uint256 myId = profileOf[msg.sender];
        require(myId != 0, "vexoSocial: no profile");
        require(!_recoveryRequests[profileId].executed, "vexoSocial: already executed");
        require(!recoveryApproved[profileId][myId], "vexoSocial: already approved");
        require(_isGuardian(profileId, myId), "vexoSocial: not a guardian");

        recoveryApproved[profileId][myId] = true;
        _recoveryRequests[profileId].approvals++;
        emit RecoveryApproved(profileId, myId);

        if (_recoveryRequests[profileId].approvals >= recoveryThreshold[profileId]) {
            _executeRecovery(profileId);
        }
    }

    function getRecoveryRequest(uint256 profileId)
        external
        view
        returns (
            address newWallet,
            uint256 approvals,
            bool executed
        )
    {
        RecoveryRequest storage req = _recoveryRequests[profileId];
        return (req.newWallet, req.approvals, req.executed);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    function _isGuardian(uint256 profileId, uint256 guardianId) internal view returns (bool) {
        uint256[] storage g = _guardians[profileId];
        for (uint256 i = 0; i < g.length; i++) {
            if (g[i] == guardianId) return true;
        }
        return false;
    }

    function _executeRecovery(uint256 profileId) internal {
        address oldWallet = ownerOf[profileId];
        address newWallet = _recoveryRequests[profileId].newWallet;
        _recoveryRequests[profileId].executed = true;

        ownerOf[profileId] = newWallet;
        profileOf[oldWallet] = 0;
        profileOf[newWallet] = profileId;

        emit RecoveryExecuted(profileId, oldWallet, newWallet);
    }

    function _removeFromArray(uint256[] storage arr, uint256 value) internal {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == value) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                return;
            }
        }
    }
}
