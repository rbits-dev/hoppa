import { ethers, BigNumber } from "ethers";
import { CHAIN_CONFIGS } from "./ChainInfo";

const ERR_NO_WALLET = "No wallet found or permission denied";

interface ChainData {
  [chainId: string]: {
    hallOfFameContract: string;
    hoppaCardsContract: string;
    hoppaArtist: string;
  };
}

interface NftCollections {
  [chainId: string]: {
    addresses: string[];
  }
}

const chainData: ChainData = {
  "1": {
    hallOfFameContract: "0x4227Ba2Be772Ff4B505696eBDaDaEc0a7149d5c7",

    hoppaCardsContract: "0x5AeB855344077073474e7d5b81df45242C2fD468",
    hoppaArtist: "0xe941e3adA31bF3e6300eBcfeB8D12BA7AFE8EA2b",
  },
  "56": {
    hallOfFameContract: "0x9d811D1600236cE2874A1f3cA2E7318cABe2DB7d",
    hoppaCardsContract: "0xb8eB97a1d6393B087EEACb33c3399505a3219d3D",
    hoppaArtist: "",
  }, 
  "8453": {
    hallOfFameContract: "0x43dec8a0d8F7e31F73111cAA6C86977dd95158c6",
    hoppaCardsContract: "0x3569F398756a2F72a960625bb39356db412C6F53",
    hoppaArtist: "0x9C2f45DbdA7367269bc47560275Cf587D71d8B7B",
  },
  "84532": {
    hallOfFameContract: "",
    hoppaCardsContract: "0x6abE1cAeBED860d0A3861Ed4Cb824a9bce2874fb",
    hoppaArtist: "" ,
  },
  "11155111": {
    hallOfFameContract: "",
    hoppaCardsContract: "0x01Ec22e836e669293749904e26a483Ec4E78fE76",
    hoppaArtist: "",
  },

};

const nftCollections: NftCollections = {
  "1": {
    addresses: [ "0x2A85FfbB9B978D6966915C13D9957D9ECC94e75D", "0xC5fBCeff4aceF8eE53016DcC2D0e98ba21dFC785", "0x7eB4c1Efc46c37FF5c7D2d6c72E5B1B98e28069E", "0x5AeB855344077073474e7d5b81df45242C2fD468" ]
  },
  "56": {
    addresses: [ "0x8004d73663F03Bc6dDB84d316ba0929240F6a8BA", "0xa54c728f58c8dFA6AadCe40fa4D32457d5d3eFCD", "0x67af3a5765299a3E2F869C3002204c749BD185E9", "0xf86E258d7D363bfDd0d1fC2B1e70D418a56c8154", "0xb8eB97a1d6393B087EEACb33c3399505a3219d3D"  ]
  },
  "8453": {
    addresses: [ "0x3569F398756a2F72a960625bb39356db412C6F53", "0xC5fBCeff4aceF8eE53016DcC2D0e98ba21dFC785", "0x2A85FfbB9B978D6966915C13D9957D9ECC94e75D", "0x7eB4c1Efc46c37FF5c7D2d6c72E5B1B98e28069E" ]
  },
  "84532": {
    addresses: [ "0x6abE1cAeBED860d0A3861Ed4Cb824a9bce2874fb", "0x5A73Ce328861855AD8b872ADE473cf21f646515B", "0xf99CbF78c764D30a209ABB21bd804526dc221239", "0x2388039c830eF2c70beBe766333187C4bda938A0" ]
  },
  "11155111": {
    addresses: [ "0x01Ec22e836e669293749904e26a483Ec4E78fE76" ]
  }
};

const RBITS_TOKEN_CONTRACT =  "0xa6EbCC4C5C0316191eA95BFC90F591DF23A03DFE";

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
  var currentChainId: string;
  var isValid: boolean;
  var currentChainData: {
    hallOfFameContract: string;
    hoppaCardsContract: string;
    hoppaArtist: string;
  };
  interface Window {
      ethereum: import('ethers').providers.ExternalProvider;
  }
}

export function selectChain(id: string) {
  if( chainData.hasOwnProperty(id) ) {
    globalThis.currentChainId = id;
    globalThis.currentChainData = chainData[ id ];
    globalThis.isValid = true;
    console.log( globalThis.currentChainData );
  }
  else {
    globalThis.isValid = false;
  }
}

export function initEmpty() {
  globalThis.rabbitsBalance = 0;
  globalThis.changeEvent = 0;
  globalThis.adReturn = "hoppa";
  globalThis.selectedAddress = "";
  globalThis.isValid = false;
}

export function init() {

    if( window.ethereum === undefined) {
        globalThis.noWallet = true;
        console.log("No wallet installed");
        return;
    }

    globalThis.provider = new ethers.providers.Web3Provider(window.ethereum);
    globalThis.selectedAddress = "";

    (window.ethereum as any).on( 'accountsChanged', function(accounts) {
      if( accounts.length > 0 ) {
        getCurrentAccount();
        globalThis.changeEvent ++;
      }
    });

    (window.ethereum as any).on( 'network', (newNet,oldNet) => {

      if(newNet.chainId == 1 || newNet.chainId == 8453|| newNet.chainId == 56 ) {
        getCurrentAccount();
        globalThis.changeEvent ++;
      }
      
    });

    (window.ethereum as any).on( 'disconnect', (code,reason) => {
      if( globalThis.provider && globalThis.provider.close )
          globalThis.provider.close();
    });

    console.log("Initialized");
}

export async function getUserBalance(addr: string): Promise<number> {
    try {
        const provider = new ethers.providers.JsonRpcProvider(CHAIN_CONFIGS[1].config.params[0].rpcUrls[0]);
        
        const abi = [
            {
                constant: true,
                inputs: [
                    {
                        name: '_owner',
                        type: 'address',
                    },
                ],
                name: 'balanceOf',
                outputs: [
                    {
                        name: 'balance',
                        type: 'uint256',
                    },
                ],
                payable: false,
                stateMutability: 'view',
                type: 'function',
            },
        ];
        
        const rabbitContract = new ethers.Contract(RBITS_TOKEN_CONTRACT, abi, provider);
        const rabbitsBalance = await rabbitContract.balanceOf(addr);

        return Number(rabbitsBalance);
    } catch (e) {
        console.log('Unable to get balance:', e);
        return 0;
    }
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

    if( !chainData.hasOwnProperty( chainId.toString() )) {
      console.log("Wallet is not connected with ETH, BSC or Base: ", chainId);
      return;
    }

    selectChain(chainId.toString());

    await globalThis.provider.send("eth_requestAccounts", []);

    globalThis.signer = globalThis.provider.getSigner();
    // save the currently connected address
    globalThis.selectedAddress = await globalThis.signer.getAddress();
    
    globalThis.rabbitBalance = await getUserBalance(globalThis.selectedAddress);

    await getMyNFTs(1);
    await getMyNFTs(56);
    await getMyNFTs(8453);
    
    await findCards();

}

export function getLink() {
  const defaultLink = "https://rbits.xyz/boxes/live"
  if( !globalThis.isValid )
    return defaultLink;
  if( globalThis.currentChainData.hoppaCardsContract === "" ) {
    return defaultLink;
  }
  if( globalThis.currentChainData.hoppaArtist === "" ) {
    return defaultLink;
  }
  return "https://rbits.xyz/boxes/artist/" + globalThis.currentChainData.hoppaArtist;
}

export async function findCards() {
  
  if( !globalThis.isValid ) {
    console.log("Not connected with a valid chain");
    return;
  }

  if( globalThis.currentChainData.hoppaCardsContract === "" ) {
    console.log("No Hoppa game cards on chain " + globalThis.chainId + " yet");
    return;
  }
  
  let abi;
  if( globalThis.chainId == 56 ) {
    abi = [
      "function balanceOf(address _owner, uint256 _id) external view returns (uint256)",
    ];
  }
  else {
    abi = [
      "function getAssetCount(address user, uint256 assetType) external view returns(uint256)",
    ];
  }

  const c = new ethers.Contract(globalThis.currentChainData.hoppaCardsContract, abi , globalThis.signer );
  let cards: string[] = new Array(10);

  // zero out array
  for( let i = 0; i < 9; i ++ ) {
    cards[i] = "0";
  }

  for( let i = 0; i < 9; i ++ ) {
    let balance;
    if(globalThis.chainId == 56 ) {
      balance = await c.balanceOf( globalThis.selectedAddress, (i+1) ); // old erc1155
    }
    else {
      balance = await c.getAssetCount( globalThis.selectedAddress, i ); // new erc721
    }
    if( balance > 0 ) {
      globalThis.hasNFT = true;
      console.log("Has Hoppa Card " + i );
    }
    let bn = "" + balance;
    cards[i]= bn;
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

  const hallOfFame = new ethers.Contract(globalThis.currentChainData.hallOfFameContract, abi , globalThis.signer );

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
  
 
  const hallOfFame = new ethers.Contract(globalThis.currentChainData.hallOfFameContract, hallOfFameABI , globalThis.signer );

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
 
  const hallOfFame = new ethers.Contract(globalThis.currentChainData.hallOfFameContract, hallOfFameABI , globalThis.signer );

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

  if(globalThis.hasNFT)
    return false;

  if(globalThis.rabbitBalance > 0)
    return false;

  return true;
}

export async function getMyNFTs( chainId ) {

  if( !nftCollections.hasOwnProperty( chainId )) {
    console.log("No NFT collections on currently selected chain");
    return;
  }
 
  const nftAddress: string[] = nftCollections[ chainId ].addresses;

  let numNFTs = 0;
  
  console.log("Check for NFTs from " + nftAddress );
  
  newRequest(chainId).then( data => { 
    if( data == null ) {
      console.log("Server Error. Please try again later.");
      return;
    }
    const arr = data.data;
   
    numNFTs = arr?.nftTotal
  });

  if(numNFTs > 0)
    globalThis.hasNFT = true;
  
}

export async function newRequest(chainId) {

  const url = 'https://rbits.xyz/boxes/backend/api/landingPageData?userAddress=' + globalThis.selectedAddress;
  const response = await fetch( url, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-cache',
    redirect: 'follow',
    headers: {
      AppKey: 'mTb+T!5!crBEQEL2!$PJ9&JSjeT3M6Hs*RytA-eaDSBS5UU@8-fCJHu6F?kp@s+JTu2-_-V8L#?5',
      Blockchainid: chainId,
    }
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