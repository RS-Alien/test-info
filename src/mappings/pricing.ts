/* eslint-disable prefer-const */
import { Pair, Token, Bundle } from '../types/schema'
import { BigDecimal, Address, BigInt } from '@graphprotocol/graph-ts/index'
import { ZERO_BD, factoryContract, ADDRESS_ZERO, ONE_BD, UNTRACKED_PAIRS } from './helpers'

const WETH_ADDRESS = '0x4446Fc4eb47f2f6586f9fAAb68B3498F86C07521'
const USDC_WETH_PAIR = '0xc2cacd273630bc1dcb1c7ca398374896fa1d6322' // created 10008355
const BUSD_WETH_PAIR = '0x26d94a2e3bd703847c3be3c30ead42b926b427c2' // created block 10042267
const USDT_WETH_PAIR = '0x1116b80fd0ff9a980dcfbfa3ed477bfa6bbd6a85' // created block 10093341

export function getEthPriceInUSD(): BigDecimal {
  // fetch eth prices for each stablecoin
  let busdPair = Pair.load(BUSD_WETH_PAIR) // busd is token1
  let usdcPair = Pair.load(USDC_WETH_PAIR) // usdc is token1
  let usdtPair = Pair.load(USDT_WETH_PAIR) // usdt is token0

  // all 3 have been created
  if (busdPair !== null && usdcPair !== null && usdtPair !== null) {
    let totalLiquidityETH = busdPair.reserve0.plus(usdcPair.reserve0).plus(usdtPair.reserve1)
    let busdWeight = busdPair.reserve0.div(totalLiquidityETH)
    let usdcWeight = usdcPair.reserve0.div(totalLiquidityETH)
    let usdtWeight = usdtPair.reserve1.div(totalLiquidityETH)
    return busdPair.token1Price
      .times(busdWeight)
      .plus(usdcPair.token1Price.times(usdcWeight))
      .plus(usdtPair.token0Price.times(usdtWeight))
    // busd and USDC have been created
  } else if (busdPair !== null && usdcPair !== null) {
    let totalLiquidityETH = busdPair.reserve0.plus(usdcPair.reserve0)
    let busdWeight = busdPair.reserve0.div(totalLiquidityETH)
    let usdcWeight = usdcPair.reserve0.div(totalLiquidityETH)
    return busdPair.token1Price.times(busdWeight).plus(usdcPair.token1Price.times(usdcWeight))
    // USDC is the only pair so far
  } else if (usdcPair !== null) {
    return usdcPair.token1Price
  } else {
    return ZERO_BD
  }
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  '0x4446Fc4eb47f2f6586f9fAAb68B3498F86C07521', // WETH
  '0x755d74d009f656ca1652cbdc135e3b6abfccc455', // KSF
  '0x0039f574ee5cc39bdd162e9a88e3eb1f111baf48', // USDT
  '0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d', // BUSD
  '0x1bbd57143428452a4deb42519391a0a436481c8e', // RS
  '0x980a5afef3d17ad98635f6c5aebcbaeded3c3430', // USDC
  '0x639a647fbe20b6c8ac19e48e2de44ea792c62c5c', // BNB
  '0xf55af137a98607f7ed2efefa4cd2dfe70e4253b1', // ETH
  '0x218c3c3d49d0e7b37aff0d8bb079de36ae61a4c0', // BTC
  '0xc9baa8cfdde8e328787e29b4b078abf2dadc2055' // DAI
]

// minimum liquidity required to count towards tracked volume for pairs with small # of Lps
let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString('400000')

// minimum liquidity for price to get tracked
let MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString('2')

/**
 * Search through graph to find derived Eth per token.
 * @todo update to be derived ETH (add stablecoin estimates)
 **/
export function findEthPerToken(token: Token): BigDecimal {
  if (token.id == WETH_ADDRESS) {
    return ONE_BD
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    let pairAddress = factoryContract.getPair(Address.fromString(token.id), Address.fromString(WHITELIST[i]))
    if (pairAddress.toHexString() != ADDRESS_ZERO) {
      let pair = Pair.load(pairAddress.toHexString())
      if (pair.token1 == token.id && pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        let token0 = Token.load(pair.token0)
        return pair.token0Price.times(token0.derivedETH as BigDecimal) // return token1 per our token * Eth per token 1
      }
      if (pair.token1 == token.id && pair.reserveETH.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        let token1 = Token.load(pair.token1)
        return pair.token1Price.times(token1.derivedETH as BigDecimal) // return token0 per our token * ETH per token 0
      }
    }
  }
  return ZERO_BD // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  tokenAmount1: BigDecimal,
  token1: Token,
  tokenAmount0: BigDecimal,
  token0: Token,
  pair: Pair
): BigDecimal {
  let bundle = Bundle.load('1')
  let price1 = token1.derivedETH.times(bundle.ethPrice)
  let price0 = token0.derivedETH.times(bundle.ethPrice)

  // dont count tracked volume on these pairs - usually rebass tokens
  if (UNTRACKED_PAIRS.includes(pair.id)) {
    return ZERO_BD
  }

  // if less than 5 LPs, require high minimum reserve amount amount or return 0
  if (pair.liquidityProviderCount.lt(BigInt.fromI32(5))) {
    let reserve1USD = pair.reserve1.times(price1)
    let reserve0USD = pair.reserve0.times(price0)
    if (WHITELIST.includes(token1.id) && WHITELIST.includes(token0.id)) {
      if (reserve1USD.plus(reserve0USD).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (WHITELIST.includes(token1.id) && !WHITELIST.includes(token0.id)) {
      if (reserve1USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (!WHITELIST.includes(token1.id) && WHITELIST.includes(token0.id)) {
      if (reserve0USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
  }

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token1.id) && WHITELIST.includes(token0.id)) {
    return tokenAmount1
      .times(price1)
      .plus(tokenAmount0.times(price0))
      .div(BigDecimal.fromString('2'))
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token1.id) && !WHITELIST.includes(token0.id)) {
    return tokenAmount1.times(price1)
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token1.id) && WHITELIST.includes(token0.id)) {
    return tokenAmount0.times(price0)
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  tokenAmount1: BigDecimal,
  token1: Token,
  tokenAmount0: BigDecimal,
  token0: Token
): BigDecimal {
  let bundle = Bundle.load('1')
  let price1 = token1.derivedETH.times(bundle.ethPrice)
  let price0 = token0.derivedETH.times(bundle.ethPrice)

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token1.id) && WHITELIST.includes(token0.id)) {
    return tokenAmount1.times(price1).plus(tokenAmount0.times(price0))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token1.id) && !WHITELIST.includes(token0.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token1.id) && WHITELIST.includes(token0.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}
