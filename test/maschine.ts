import { ethers } from 'hardhat'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { solidity } from 'ethereum-waffle'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Maschine } from '../typechain/Maschine'
import { Maschine__factory } from '../typechain/factories/Maschine__factory'

chai.use(solidity)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Maschine smart contract', () => {
  let alice: SignerWithAddress, bob: SignerWithAddress;
  let tokenContractInstance: Maschine
  let aliceMaschine: Maschine, bobMaschine: Maschine
  const tokenTokenIdMax = '10'
  const baseURIValue = 'https://maschine.harmvandendorpel.com/api/metadata/'

  beforeEach(async () => {
    [alice, bob] = await ethers.getSigners()
    const Factory = (await ethers.getContractFactory(
      'Maschine',
      alice
    )) as Maschine__factory

    const payoutAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
    const minterContractAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'

    tokenContractInstance = await Factory.deploy(
      payoutAddress,
      minterContractAddress,
      tokenTokenIdMax,
      baseURIValue
    )
    await tokenContractInstance.deployed()
    aliceMaschine = tokenContractInstance.connect(alice)
    bobMaschine = tokenContractInstance.connect(bob)
  })

  it('can mint when admin', async () => {
    expect(await aliceMaschine.totalSupply()).to.equal(0)
    expect(await aliceMaschine.mint('0x9011Eb570D1bE09eA4d10f38c119DCDF29725c41', {}))
    expect(await aliceMaschine.totalSupply()).to.equal(1)
  })

  it('cannot mint when not admin', async () => {
    expect(await aliceMaschine.totalSupply()).to.equal(0)
    await expect(
      bobMaschine.mint('0x9011Eb570D1bE09eA4d10f38c119DCDF29725c41', {})
    ).to.revertedWith('Only minter contract and owner can mint')
    expect(await aliceMaschine.totalSupply()).to.equal(0)
  })

  it('cannot mint more than the max. supply', async () => {
    expect(await aliceMaschine.totalSupply()).to.equal(0)

    for (let i = 0; i < parseInt(tokenTokenIdMax); i++) {
      await aliceMaschine.mint('0x9011Eb570D1bE09eA4d10f38c119DCDF29725c41', {})
    }

    expect(await aliceMaschine.totalSupply()).to.equal(
      parseInt(tokenTokenIdMax)
    )
    await expect(
      aliceMaschine.mint('0x9011Eb570D1bE09eA4d10f38c119DCDF29725c41', {})
    ).to.revertedWith('Max. supply reached')
  })

  it('cannot mint when contract is paused', async () => {
    await aliceMaschine.pause()
    await expect(
      aliceMaschine.mint('0x9011Eb570D1bE09eA4d10f38c119DCDF29725c41', {})
    ).to.revertedWith('Pausable: paused')
    expect(await aliceMaschine.totalSupply()).to.equal(0)
    await aliceMaschine.unpause()
    await aliceMaschine.mint('0x9011Eb570D1bE09eA4d10f38c119DCDF29725c41', {})
    expect(await aliceMaschine.totalSupply()).to.equal(1)
  })

  it('returns a correct tokenURI', async () => {
    await expect(aliceMaschine.tokenURI(1)).to.revertedWith(
      'ERC721: invalid token ID'
    )
    expect(
      await aliceMaschine.mint('0x9011Eb570D1bE09eA4d10f38c119DCDF29725c41', {})
    )
    expect(await aliceMaschine.tokenURI(1)).to.equal(`${baseURIValue}1`)
  })

  it('allows auction contract to mint', async () => {
    // make bob the auction contract
    await aliceMaschine.setMinterAddress(bob.address)
    expect(await aliceMaschine.minterContractAddress()).to.equal(
      bob.address
    )
    expect(
      await bobMaschine.mint('0x9011Eb570D1bE09eA4d10f38c119DCDF29725c41', {})
    )
    expect(await aliceMaschine.totalSupply()).to.equal(1)
  })

  it('should not allow more minting after end mint has been called', async () => {
    expect(await aliceMaschine.totalSupply()).to.equal(0)
    await aliceMaschine.mint('0x9011Eb570D1bE09eA4d10f38c119DCDF29725c41', {})
    expect(await aliceMaschine.totalSupply()).to.equal(1)
    await aliceMaschine.endMint()
    await expect(
      aliceMaschine.mint('0x9011Eb570D1bE09eA4d10f38c119DCDF29725c41', {})
    ).to.revertedWith('Max. supply reached')
  })
})
