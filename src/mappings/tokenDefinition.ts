import {
  Address,
  BigInt,
} from "@graphprotocol/graph-ts"

// Initialize a Token Definition with the attributes
export class TokenDefinition {
  address : Address
  symbol: string
  name: string
  decimals: BigInt

  // Initialize a Token Definition with its attributes
  constructor(address: Address, symbol: string, name: string, decimals: BigInt) {
    this.address = address
    this.symbol = symbol
    this.name = name
    this.decimals = decimals
  }

  // Get all tokens with a static defintion
  static getStaticDefinitions(): Array<TokenDefinition> {
    let staticDefinitions = new Array<TokenDefinition>(6)

   
    // Add UNI
    let tokenUNI = new TokenDefinition(
      Address.fromString('0xEe58E4D62b10A92dB1089d4D040B759C28aE16Cd'),
      'UNI',
      'KCC-Peg Uniswap',
      BigInt.fromI32(9)
    )
    staticDefinitions.push(tokenUNI)

    // Add AAVE
    let tokenAAVE = new TokenDefinition(
      Address.fromString('0xE76e97C157658004eE22e01C03a5e21A4655A2Fd'),
      'AAVE',
      'KCC-Peg Aave Token',
      BigInt.fromI32(18)
    )
    staticDefinitions.push(tokenAAVE)

    // Add LINK
    let tokenLINK = new TokenDefinition(
      Address.fromString('0x47841910329aaa6b88D5e9DcdE9000195151dc72'),
      'LINK',
      'KCC-Peg Chainlink',
      BigInt.fromI32(18)
    )
    staticDefinitions.push(tokenLINK)

    // Add MATIC
    let tokenMATIC = new TokenDefinition(
      Address.fromString('0x1B8e27ABA297466fc6765Ce55BD12A8E216759da'),
      'MATIC',
      'KCC-Peg Polygon',
      BigInt.fromI32(18)
    )
    staticDefinitions.push(tokenMATIC)

    // Add GRT
    let tokenGRT = new TokenDefinition(
      Address.fromString('0xb49dd3eDB98FBe82A01DFcb556Cd016964baf5A3'),
      'GRT',
      'KCC-Peg The Graph',
      BigInt.fromI32(16)
    )
    staticDefinitions.push(tokenGRT)

    // Add RS
    let tokenRS = new TokenDefinition(
      Address.fromString('0x1bbd57143428452a4deb42519391a0a436481c8e'),
      'RS',
      'Reward Token',
      BigInt.fromI32(18)
    )
    staticDefinitions.push(tokenRS)

    return staticDefinitions
  }

  // Helper for hardcoded tokens
  static fromAddress(tokenAddress: Address) : TokenDefinition | null {
    let staticDefinitions = this.getStaticDefinitions()
    let tokenAddressHex = tokenAddress.toHexString()

    // Search the definition using the address
    for (let i = 0; i < staticDefinitions.length; i++) {
      let staticDefinition = staticDefinitions[i]
      if(staticDefinition.address.toHexString() == tokenAddressHex) {
        return staticDefinition
      }
    }

    // If not found, return null
    return null
  }

}