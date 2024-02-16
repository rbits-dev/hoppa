import { ethers, BigNumber } from "ethers";

const ERR_NO_WALLET = "No wallet found or permission denied";

declare global {
    var rabbitBalance: number;
    var hasNFT: boolean;
    var selectedAddress: string;
    var provider: ethers.providers.Web3Provider;
    var signer: ethers.providers.JsonRpcSigner;
    var noWallet: boolean;
    var chainId: number;
    var changeEvent: number;
    var adReturn: string;
    var totalTokensStaked: number;
    var allowance: number;
    var leavePenalty: number;
    var spawnLocation: number;
    interface Window {
        ethereum: import('ethers').providers.ExternalProvider;
    }
}

const rabbitTokenContract     = "0xa6EbCC4C5C0316191eA95BFC90F591DF23A03DFE";
const hoppaCardsContract      = "0xb8eB97a1d6393B087EEACb33c3399505a3219d3D"; //FIXME
const hallOfFameContract      = "0x4227Ba2Be772Ff4B505696eBDaDaEc0a7149d5c7";

export function init() {

    if( window.ethereum === undefined) {
        globalThis.noWallet = true;
        console.log("No wallet installed");
        return;
    }

    globalThis.provider = new ethers.providers.Web3Provider(window.ethereum);
    globalThis.rabbitsBalance = 0;
    globalThis.changeEvent = 0;
    globalThis.adReturn = "hoppa";
    globalThis.selectedAddress = "";
    
    (window.ethereum as any).on( 'accountsChanged', function(accounts) {
      if( accounts.length > 0 ) {
        getCurrentAccount();
        getMyNFTCollections();
        findCards();
        globalThis.changeEvent ++;
      }
    });

    (window.ethereum as any).on( 'network', (newNet,oldNet) => {
      if(newNet.chainId == 1) {
        getCurrentAccount();
        getMyNFTCollections();
        findCards();
        globalThis.changeEvent ++;
      }
    });

    (window.ethereum as any).on( 'disconnect', (code,reason) => {
      if( globalThis.provider && globalThis.provider.close )
          globalThis.provider.close();
    });

    console.log("Connected");

    findCards();
}

export async function requestAccounts() {
  try { 
    await globalThis.provider.send("eth_requestAccounts", []);
  
    globalThis.signer = globalThis.provider.getSigner();
    
    globalThis.selectedAddress = await globalThis.signer.getAddress();
    
    globalThis.noWallet = false;
  }
  catch(e) {
    globalThis.noWallet = true;
    console.log(e);
  }
  
}

export async function disconnectAccount() {
  if( globalThis.noWallet ) {
    return;
 }

 if( globalThis.provider && globalThis.provider.close )
     globalThis.provider.close();
}

export async function getCurrentAccount() {
    if( globalThis.noWallet ) {
       return;
    }

    const { chainId } = await provider.getNetwork();

    globalThis.chainId = chainId;

    if(globalThis.chainId != 1) {
      console.log("Wallet is not connected with the Ethereum Chain: ", chainId);
      return;
    }

    await globalThis.provider.send("eth_requestAccounts", []);

    globalThis.signer = globalThis.provider.getSigner();
    // save the currently connected address
    globalThis.selectedAddress = await globalThis.signer.getAddress();
    
    const abi = [
        "function balanceOf(address account) external view returns (uint256)",
    ];
    
    const rabbitContract = new ethers.Contract(rabbitTokenContract, abi , globalThis.signer );    
    globalThis.rabbitsBalance = await rabbitContract.balanceOf( globalThis.selectedAddress );
    
}

export async function findCards() {
 /* 
  await requestAccounts();
  
  const abi = [
      "function balanceOf(address _owner, uint256 _id) external view returns (uint256)",
  ];

  const c = new ethers.Contract(hoppaCardsContract, abi , globalThis.signer );
  let cards: string[] = new Array(10);
  cards[0] = "0";
  for( let i = 1; i < 10; i ++ ) {
    let balance = await c.balanceOf( globalThis.selectedAddress, i );
    if( balance > 0 ) 
      globalThis.hasNFT = true;
    let bn = "" + balance;
    cards[i]= bn;
  }
  */
  let cards: string[] = new Array(10);
  for( let i = 1; i < 10; i ++ ) {
    cards[i] = "0";
  }

  const data = JSON.stringify(cards);
  window.localStorage.setItem( 'ra8bit.cards', data );
}


export async function updateHighscore( name, score ): Promise<string> {
  
  await requestAccounts();

  if( globalThis.noWallet )
    return ERR_NO_WALLET;
  
  const abi = [
      "function updateScore(string memory initials, uint256 score) public",
  ];

  const hallOfFame = new ethers.Contract(hallOfFameContract, abi , globalThis.signer );

  try {
    const tx = await hallOfFame.updateScore( name, score );
    await tx.wait();
  }
  catch( error: any ) {
    return error.reason;
  }

  return "OK";
}

const hallOfFameABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"maker","type":"address"}],"name":"GameMakerAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"maker","type":"address"}],"name":"GameMakerRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"maker","type":"address"},{"indexed":false,"internalType":"uint8","name":"position","type":"uint8"}],"name":"HighscoreRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"maker","type":"address"}],"name":"HighscoreReset","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"initials","type":"string"},{"indexed":false,"internalType":"uint256","name":"score","type":"uint256"},{"indexed":false,"internalType":"address","name":"player","type":"address"}],"name":"HighscoreUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"inputs":[{"internalType":"address","name":"gamemaker","type":"address"}],"name":"addGameMaker","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"clearHallOfFame","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"gameMakers","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getHallOfFame","outputs":[{"components":[{"internalType":"address","name":"player","type":"address"},{"internalType":"uint256","name":"score","type":"uint256"},{"internalType":"string","name":"initials","type":"string"}],"internalType":"struct HallOfFame.HighScores[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"hallOfFame","outputs":[{"internalType":"address","name":"player","type":"address"},{"internalType":"uint256","name":"score","type":"uint256"},{"internalType":"string","name":"initials","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"gamemaker","type":"address"}],"name":"removeGameMaker","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"score","type":"uint256"}],"name":"removeScore","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"initials","type":"string"},{"internalType":"uint256","name":"score","type":"uint256"}],"name":"updateScore","outputs":[],"stateMutability":"nonpayable","type":"function"}];


export async function getHighscores(): Promise<string> {

  await requestAccounts();

  if( globalThis.noWallet )
    return "";
  
 
  const hallOfFame = new ethers.Contract(hallOfFameContract, hallOfFameABI , globalThis.signer );

  try {
    const highscores = await hallOfFame.getHallOfFame( );
    
    return highscores;
  }
  catch( error: any ) {
    console.log( "error " + error.reason );
  }

  return "";
}

export async function hasNewHighScore(score): Promise<boolean> {
  await requestAccounts();

  if( globalThis.noWallet )
    return false;

  await globalThis.provider.send("eth_requestAccounts", []);
  globalThis.signer = globalThis.provider.getSigner();
  // save the currently connected address
  globalThis.selectedAddress = await globalThis.signer.getAddress();
 
  const hallOfFame = new ethers.Contract(hallOfFameContract, hallOfFameABI , globalThis.signer );

  try {
    const highscores = await hallOfFame.getHallOfFame( );
    for( let i = 0; i < highscores.length; i ++ ) {
      let p = highscores[i];
      if( score > p[1].toNumber() )
        return true;
    }
    return highscores;
  }
  catch( error: any ) {
    console.log( "error " + error.reason );
    return false;
  }

  return false;
}

export function isNotEligible(): boolean {
    return globalThis.noWallet || (globalThis.rabbitsBalance == 0);
}

export async function getMyNFTCollections() {
  /*let numCollections = 0;
  const nftAddress = [
    '0x82A3E038048CF02C19e60856564bE209899d4F12',
    '0x0CBd80abc67d403E4258894E62235DbaF93F2779',
    '0xa552F4c1eD2115779c19B835dCF5A895Cdc25624',
    '0xa8e67efd3DDAD234947d8BC80F36aa8F9eb35dF0',
    '0x8004d73663F03Bc6dDB84d316ba0929240F6a8BA',
    '0x67af3a5765299a3E2F869C3002204c749BD185E9',
    '0xa15803a167A94E5d19F320c7F3b421be4C5CA1B5',
  ];

  newRequest().then( data => { 
    if( data == null ) {
      console.log("Server Error. Please try again later.");
      return;
    }
    const arr = data.data;
   
    for( const d of arr.data ) {
        if( nftAddress.includes( d.ArtistNFTAddress ) )
          numCollections ++;
    }
  });

  if(numCollections > 0)
    globalThis.hasNFT = true;
  */
}



function numberToUint256(value: number): BigNumber {
  
  return ethers.utils.parseUnits( value.toString(), 9 );
}

function uint256Tonumber(big: BigNumber): number {

  return parseInt( big.toString() ) / 1e9;

}

export async function newRequest() {
  const { chainId }  = await provider.getNetwork();
  const url = 'https://rbits.xyz/boxes/api/userNftData?blockchainId=' + chainId + '&userAddress=' + globalThis.selectedAddress;
  const response = await fetch( url, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-cache',
    redirect: 'follow',
  }).then( (response) => {
    if( response.status >= 400 && response.status < 600) {
      console.log("Oops try again later ", response);
      return null;
    }
    return response;
  }).then( (returnedResponse) => {
    return returnedResponse?.json();
  }).catch( (error) => {
     console.log("Oops try again much later:",error);
  });
  return response;
}