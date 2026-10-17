// Generated from contracts/out (forge build). Regenerate if the contracts change.
// Only the calls the web app makes, plus every custom error a swap can bubble up, so viem decodes reverts by name.

export const SWAP_ROUTER_ABI = [
  {
    "type": "function",
    "name": "previewExactIn",
    "inputs": [
      {
        "name": "p",
        "type": "tuple",
        "internalType": "struct SwapRouter.SwapParams",
        "components": [
          {
            "name": "tokenIn",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "tokenOut",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amountIn",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minAmountOut",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "to",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "deadline",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "quote",
            "type": "tuple",
            "internalType": "struct Types.MakerQuote",
            "components": [
              {
                "name": "maker",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "tokenIn",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "tokenOut",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "amountIn",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "amountOut",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "taker",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "expiry",
                "type": "uint40",
                "internalType": "uint40"
              },
              {
                "name": "nonce",
                "type": "uint256",
                "internalType": "uint256"
              }
            ]
          },
          {
            "name": "quoteSig",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "amountOut",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "venue",
        "type": "uint8",
        "internalType": "enum Types.Venue"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "swapExactIn",
    "inputs": [
      {
        "name": "p",
        "type": "tuple",
        "internalType": "struct SwapRouter.SwapParams",
        "components": [
          {
            "name": "tokenIn",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "tokenOut",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amountIn",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minAmountOut",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "to",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "deadline",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "quote",
            "type": "tuple",
            "internalType": "struct Types.MakerQuote",
            "components": [
              {
                "name": "maker",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "tokenIn",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "tokenOut",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "amountIn",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "amountOut",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "taker",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "expiry",
                "type": "uint40",
                "internalType": "uint40"
              },
              {
                "name": "nonce",
                "type": "uint256",
                "internalType": "uint256"
              }
            ]
          },
          {
            "name": "quoteSig",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "amountOut",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "error",
    "name": "Expired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoLiquidity",
    "inputs": []
  },
  {
    "type": "error",
    "name": "QuoteMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "QuoteNotApplicable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "SameToken",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Slippage",
    "inputs": [
      {
        "name": "amountOut",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minAmountOut",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SwapsPaused",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BandExceeded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ClipExceeded",
    "inputs": [
      {
        "name": "notional",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "clip",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "DailyCapExceeded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ERC20InsufficientAllowance",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "allowance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InsufficientBalance",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "balance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidApprover",
    "inputs": [
      {
        "name": "approver",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidReceiver",
    "inputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidSender",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidSpender",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "InsufficientInventory",
    "inputs": [
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "available",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InventoryBandExceeded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketHalted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketNotListed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotRouter",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TvlCapExceeded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroShares",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FeedNotConfigured",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidFeedConfig",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSchedule",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketHalted",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotGovernance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PriceInvalid",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "SafeCastOverflowedUintDowncast",
    "inputs": [
      {
        "name": "bits",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "StreamDivergence",
    "inputs": [
      {
        "name": "feedPrice",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "streamPrice",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "StreamNotConfigured",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "AdapterNotSet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotEligible",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "BadSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BandExceeded",
    "inputs": [
      {
        "name": "implied",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "mid",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidShortString",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NonceAlreadyUsed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NonceTooLow",
    "inputs": []
  },
  {
    "type": "error",
    "name": "QuoteAssetRequired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "QuoteExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SelfTrade",
    "inputs": []
  },
  {
    "type": "error",
    "name": "StringTooLong",
    "inputs": [
      {
        "name": "str",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "type": "error",
    "name": "WrongTaker",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketNotConfigured",
    "inputs": []
  },
  {
    "type": "error",
    "name": "QuoteAssetNotListable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterAlreadySet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RouterNotSet",
    "inputs": []
  }
] as const;

export const ELIGIBILITY_REGISTRY_ABI = [
  {
    "type": "function",
    "name": "isEligible",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  }
] as const;
