// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {ParamController} from "../src/ParamController.sol";
import {IParamController} from "../src/interfaces/IParamController.sol";
import {EligibilityRegistry} from "../src/EligibilityRegistry.sol";
import {NativeAttestationAdapter} from "../src/adapters/NativeAttestationAdapter.sol";
import {OracleRouter} from "../src/OracleRouter.sol";
import {FeeCollector} from "../src/FeeCollector.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {RfqSettlement} from "../src/RfqSettlement.sol";
import {SwapRouter} from "../src/SwapRouter.sol";
import {AggregatorV3Interface} from "../src/interfaces/IExternal.sol";
import {Roles} from "../src/libraries/Types.sol";

/// @title Deploy
/// @notice Puts the complete Zirplus stack on Robinhood Chain mainnet (chain ID 4663) and opens the launch market.
/// @dev Environment (contracts/.env):
///        PRIVATE_KEY                   key of the deployer
///        USDG, STOCK_TOKEN, STOCK_FEED required: the quote asset, the launch Stock Token and its Chainlink feed
///        GOV, GUARDIAN                 governance owner and guardian; the deployer when empty
///        ATTESTATION_ISSUER            the signer permitted to attest roles; the deployer when empty
///        SELF_ATTEST                   when the deployer is the issuer, attest it for every role (default true)
///        TIMELOCK_DELAY                seconds, 48 hours by default (minimum 1 hour once bootstrap finishes)
///        FINISH_BOOTSTRAP              bind the ParamController to the timelock at the end (default true)
///        SEQUENCER_FEED                Chainlink L2 Sequencer Uptime Feed; skipped when empty
///        MARKET_STATUS_SOURCE          IMarketStatusSource; empty falls back to the weekday schedule
///        STREAM_ADAPTER                Chainlink Data Streams verifier adapter; optional
///        STALENESS_REGULAR / _EXTENDED / _CLOSED, MOVE_CAP_WINDOW   seconds; defaults suit a 24h-heartbeat feed
///      Run:
///        forge script script/Deploy.s.sol --rpc-url robinhood                         # simulate only
///        forge script script/Deploy.s.sol --rpc-url robinhood --broadcast --slow --verify --verifier blockscout --verifier-url "$ROBINHOOD_BLOCKSCOUT_API"
contract Deploy is Script {
    /// @dev Settings read from the environment, grouped so run() stays within the stack limit.
    struct Config {
        uint256 pk;
        address deployer;
        address gov;
        address guardian;
        address issuer;
        uint256 delay;
        bool finish;
        bool selfAttest;
        address sequencerFeed;
    }

    struct Addresses {
        address paramController;
        address eligibilityRegistry;
        address attestationAdapter;
        address oracleRouter;
        address feeCollector;
        address vaultFactory;
        address rfqSettlement;
        address swapRouter;
        address vault;
        address usdg;
        address stockToken;
        address stockFeed;
    }

    function run() external {
        require(block.chainid == 4663, "Deploy targets Robinhood Chain mainnet (4663)");
        Config memory c;
        c.pk = vm.envUint("PRIVATE_KEY");
        c.deployer = vm.addr(c.pk);
        c.gov = _optAddress("GOV", c.deployer);
        c.guardian = _optAddress("GUARDIAN", c.deployer);
        c.issuer = _optAddress("ATTESTATION_ISSUER", c.deployer);
        c.delay = _optUint("TIMELOCK_DELAY", 48 hours);
        c.finish = vm.envOr("FINISH_BOOTSTRAP", true);
        c.selfAttest = vm.envOr("SELF_ATTEST", true);
        c.sequencerFeed = _optAddress("SEQUENCER_FEED", address(0));

        // ----- External dependencies: all live contracts on Robinhood Chain -----
        Addresses memory a;
        a.usdg = _requiredContract("USDG");
        a.stockToken = _requiredContract("STOCK_TOKEN");
        a.stockFeed = _requiredContract("STOCK_FEED");

        vm.startBroadcast(c.pk);

        // ----- Core -----
        // The deployer owns the controller during bootstrap and then passes ownership to `gov`.
        ParamController params = new ParamController(c.deployer, c.guardian, c.delay);
        EligibilityRegistry eligibility = new EligibilityRegistry(params);
        NativeAttestationAdapter attestations = new NativeAttestationAdapter(params);
        OracleRouter oracle = new OracleRouter(params);
        FeeCollector fees = new FeeCollector(params);
        VaultFactory factory = new VaultFactory(params, eligibility, oracle, address(fees), a.usdg);
        RfqSettlement rfqSettlement = new RfqSettlement(params, eligibility, oracle, factory, address(fees));
        SwapRouter router = new SwapRouter(params, eligibility, factory, rfqSettlement);
        factory.setRouter(address(router));

        // ----- Parameters (bootstrap mode, so setters are called directly). Launch values follow the documentation. -----
        params.setEligibilityAdapter(address(attestations));
        params.setAttestationIssuer(c.issuer, true);
        params.setTierConfig(
            1,
            IParamController.TierConfig({
                baseHalfSpreadBps: 10,
                maxSkewBps: 15,
                inventoryBandBps: 2000,
                oracleBandBps: 75,
                maxClip: 50_000e6,
                enabled: true
            })
        );
        params.setTierConfig(
            2,
            IParamController.TierConfig({
                baseHalfSpreadBps: 20,
                maxSkewBps: 25,
                inventoryBandBps: 2000,
                oracleBandBps: 150,
                maxClip: 20_000e6,
                enabled: true
            })
        );
        params.setTierConfig(
            3,
            IParamController.TierConfig({
                baseHalfSpreadBps: 40,
                maxSkewBps: 50,
                inventoryBandBps: 2000,
                oracleBandBps: 300,
                maxClip: 5_000e6,
                enabled: true
            })
        );
        params.setMarketConfig(
            a.stockToken,
            IParamController.MarketConfig({tier: 1, dailyVolumeCap: 2_000_000e6, tvlCap: 5_000_000e6, enabled: true})
        );
        params.setRegimeParams(
            IParamController.RegimeParams({
                extendedSpreadMulBps: 15_000,
                closedSpreadMulBps: 30_000,
                extendedClipMulBps: 7_500,
                closedClipMulBps: 5_000
            })
        );
        params.setRiskParams(IParamController.RiskParams({sequencerGrace: 1 hours}));
        params.setFeeParams(IParamController.FeeParams({swapFeeBps: 2, rfqFeeBps: 2, spreadShareBps: 1000}));

        // ----- Oracle -----
        _configureOracle(oracle, a.stockToken, a.usdg, a.stockFeed);
        if (c.sequencerFeed != address(0)) oracle.setSequencerFeed(AggregatorV3Interface(c.sequencerFeed));

        // ----- Open the launch market -----
        a.vault = factory.createMarket(a.stockToken);

        // While the deployer is also the issuer, it attests itself for every role so each flow can be checked
        // right after launch. Revoke these with NativeAttestationAdapter.revoke once real issuance starts.
        if (c.selfAttest && c.issuer == c.deployer) {
            uint64 exp = uint64(block.timestamp + 365 days);
            attestations.attest(c.deployer, Roles.TRADER, "LT", 2, exp);
            attestations.attest(c.deployer, Roles.LP, "LT", 3, exp);
            attestations.attest(c.deployer, Roles.MAKER, "LT", 3, exp);
            attestations.attest(c.deployer, Roles.RELAYER, "LT", 0, exp);
        }

        if (c.finish) params.finishBootstrap();
        if (c.gov != c.deployer) params.transferOwnership(c.gov);

        vm.stopBroadcast();

        a.paramController = address(params);
        a.eligibilityRegistry = address(eligibility);
        a.attestationAdapter = address(attestations);
        a.oracleRouter = address(oracle);
        a.feeCollector = address(fees);
        a.vaultFactory = address(factory);
        a.rfqSettlement = address(rfqSettlement);
        a.swapRouter = address(router);
        _write(a);
    }

    /// @dev Kept out of run() so the long configureFeed argument list does not exhaust the stack.
    function _configureOracle(OracleRouter oracle, address token, address quote, address feed) internal {
        // Robinhood Stock Tokens expose oraclePaused() and uiMultiplier() (ERC-8056) themselves, so the token is
        // the pause and multiplier source. They do not expose marketStatus(): leave MARKET_STATUS_SOURCE empty
        // unless it points at a real IMarketStatusSource, or every quote would revert. Equity feeds update every
        // 24h or on a 0.5% move, so the staleness bounds sit just above that heartbeat.
        oracle.configureFeed(
            token,
            quote,
            AggregatorV3Interface(feed),
            uint32(_optUint("STALENESS_REGULAR", 25 hours)),
            uint32(_optUint("STALENESS_EXTENDED", 25 hours)),
            uint32(_optUint("STALENESS_CLOSED", 4 days)),
            2500,
            uint32(_optUint("MOVE_CAP_WINDOW", 1 hours)),
            200,
            _optAddress("MARKET_STATUS_SOURCE", address(0)),
            token,
            token,
            _optAddress("STREAM_ADAPTER", address(0))
        );
    }

    /// @dev Reads an address that may be unset or blank (a `KEY=` line in .env), returning `fallback_` then.
    function _optAddress(string memory key, address fallback_) internal view returns (address) {
        string memory raw = vm.envOr(key, string(""));
        return bytes(raw).length == 0 ? fallback_ : vm.parseAddress(raw);
    }

    function _optUint(string memory key, uint256 fallback_) internal view returns (uint256) {
        string memory raw = vm.envOr(key, string(""));
        return bytes(raw).length == 0 ? fallback_ : vm.parseUint(raw);
    }

    /// @dev A required dependency must be set and must have code on this chain.
    function _requiredContract(string memory key) internal view returns (address addr) {
        addr = _optAddress(key, address(0));
        require(addr != address(0), string.concat(key, " is required"));
        require(addr.code.length > 0, string.concat(key, " has no code on this chain"));
    }

    function _write(Addresses memory a) internal {
        string memory root = "zirplus";
        vm.serializeUint(root, "chainId", block.chainid);
        vm.serializeAddress(root, "ParamController", a.paramController);
        vm.serializeAddress(root, "EligibilityRegistry", a.eligibilityRegistry);
        vm.serializeAddress(root, "NativeAttestationAdapter", a.attestationAdapter);
        vm.serializeAddress(root, "OracleRouter", a.oracleRouter);
        vm.serializeAddress(root, "FeeCollector", a.feeCollector);
        vm.serializeAddress(root, "VaultFactory", a.vaultFactory);
        vm.serializeAddress(root, "RfqSettlement", a.rfqSettlement);
        vm.serializeAddress(root, "SwapRouter", a.swapRouter);
        vm.serializeAddress(root, "AnchorVault", a.vault);
        vm.serializeAddress(root, "USDG", a.usdg);
        vm.serializeAddress(root, "StockToken", a.stockToken);
        string memory json = vm.serializeAddress(root, "StockFeed", a.stockFeed);
        string memory path = string.concat("deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(json, path);
        console2.log("Deployment written to", path);
        console2.log("SwapRouter", a.swapRouter);
    }
}
