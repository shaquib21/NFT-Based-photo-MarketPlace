import React, { Component } from "react";
import getWeb3, { getGanacheWeb3, Web3 } from "../../utils/getWeb3";

import { Loader, Button, Card, Input, Table, Form, Field, Image } from 'rimble-ui';
import { zeppelinSolidityHotLoaderOptions } from '../../../config/webpack';

import styles from '../../App.module.scss';


export default class MyPhotos extends Component {
    constructor(props) {    
        super(props);

        this.state = {
          /////// Default state
          storageValue: 0,
          web3: null,
          accounts: null,
          currentAccount: null,
          route: window.location.pathname.replace("/", ""),
          loading: false,
          confirm: true,

          /////// NFT
          allPhotos: []
        };

        //this.handlePhotoNFTAddress = this.handlePhotoNFTAddress.bind(this);

        this.putOnSale = this.putOnSale.bind(this);
        this.cancelOnSale = this.cancelOnSale.bind(this);
        this.newPublish = this.newPublish.bind(this);
    }

    ///--------------------------
    /// Handler
    ///-------------------------- 
    // handlePhotoNFTAddress(event) {
    //     this.setState({ valuePhotoNFTAddress: event.target.value });
    // }


    ///---------------------------------------------------------
    /// Functions put a photo NFT on sale or cancel it on sale 
    ///---------------------------------------------------------
    newPublish = async () => {
      this.setState({loading: false});
    } 
    putOnSale = async (address) => {
        const { web3, accounts, photoNFTMarketplace, photoNFTData, PHOTO_NFT_MARKETPLACE } = this.state;
        this.setState({loading: true});
        this.setState({confirm: false});
        console.log('=== value of putOnSale ===', address);
        console.log('=== PHOTO_NFT_MARKETPLACE ===', PHOTO_NFT_MARKETPLACE);

        const PHOTO_NFT = address;

        /// Get instance by using created photoNFT address
        let PhotoNFT = {};
        PhotoNFT = require("../../../../build/contracts/PhotoNFT.json"); 
        let photoNFT = new web3.eth.Contract(PhotoNFT.abi, PHOTO_NFT);

        /// Check owner of photoId
        const photoId = 1;  /// [Note]: PhotoID is always 1. Because each photoNFT is unique.
        const owner = await photoNFT.methods.ownerOf(photoId).call();
        console.log('=== owner of photoId ===', owner);  /// [Expect]: Owner should be the PhotoNFTMarketplace.sol (This also called as a proxy/escrow contract)
            
        /// Put on sale (by a seller who is also called as owner)
        const txReceipt1 = await photoNFT.methods.approve(PHOTO_NFT_MARKETPLACE, photoId).send({ from: accounts[0] });
        const txReceipt2 = await photoNFTMarketplace.methods.openTrade(PHOTO_NFT, photoId).send({ from: accounts[0] 
        }).then(()=>{
          const timer = setTimeout(() => {
            console.log("Publised it successfully");
            this.setState({confirm: true});
          }, 6000);
          return () => clearTimeout(timer);
        });
        console.log('=== response of openTrade ===', txReceipt2);
    }

    cancelOnSale = async (address) => {
        const { web3, accounts, photoNFTMarketplace, photoNFTData, PHOTO_NFT_MARKETPLACE } = this.state;

        console.log('=== value of cancelOnSale ===', address);

        const PHOTO_NFT = address;

        /// Get instance by using created photoNFT address
        let PhotoNFT = {};
        PhotoNFT = require("../../../../build/contracts/PhotoNFT.json"); 
        let photoNFT = new web3.eth.Contract(PhotoNFT.abi, PHOTO_NFT);

        /// Check owner of photoId
        const photoId = 1;  /// [Note]: PhotoID is always 1. Because each photoNFT is unique.
        const owner = await photoNFT.methods.ownerOf(photoId).call();
        console.log('=== owner of photoId ===', owner);  /// [Expect]: Owner should be the PhotoNFTMarketplace.sol (This also called as a proxy/escrow contract)
            
        /// Cancel on sale
        //const txReceipt1 = await photoNFT.methods.approve(PHOTO_NFT_MARKETPLACE, photoId).send({ from: accounts[0] });
        const txReceipt2 = await photoNFTMarketplace.methods.cancelTrade(PHOTO_NFT, photoId).send({ from: accounts[0] });
        console.log('=== response of cancelTrade ===', txReceipt2);
    }


    ///------------------------------------- 
    /// NFT（Always load listed NFT data）
    ///-------------------------------------
    getAllPhotos = async () => {
        const { photoNFTData } = this.state

        const allPhotos = await photoNFTData.methods.getAllPhotos().call()
        console.log('=== allPhotos ===', allPhotos)

        this.setState({ allPhotos: allPhotos })
        return allPhotos
    }


    //////////////////////////////////// 
    /// Ganache
    ////////////////////////////////////
    getGanacheAddresses = async () => {
        if (!this.ganacheProvider) {
          this.ganacheProvider = getGanacheWeb3();
        }
        if (this.ganacheProvider) {
          return await this.ganacheProvider.eth.getAccounts();
        }
        return [];
    }

    componentDidMount = async () => {
        const hotLoaderDisabled = zeppelinSolidityHotLoaderOptions.disabled;
     
        let PhotoNFTMarketplace = {};
        let PhotoNFTData = {};
        try {
          PhotoNFTMarketplace = require("../../../../build/contracts/PhotoNFTMarketplace.json");
          PhotoNFTData = require("../../../../build/contracts/PhotoNFTData.json");
        } catch (e) {
          console.log(e);
        }

        try {
          const isProd = process.env.NODE_ENV === 'production';
          if (!isProd) {
            // Get network provider and web3 instance.
            const web3 = await getWeb3();
            let ganacheAccounts = [];

            try {
              ganacheAccounts = await this.getGanacheAddresses();
            } catch (e) {
              console.log('Ganache is not running');
            }

            // Use web3 to get the user's accounts.
            const accounts = await web3.eth.getAccounts();
            const currentAccount = accounts[0];

            // Get the contract instance.
            const networkId = await web3.eth.net.getId();
            const networkType = await web3.eth.net.getNetworkType();
            const isMetaMask = web3.currentProvider.isMetaMask;
            let balance = accounts.length > 0 ? await web3.eth.getBalance(accounts[0]): web3.utils.toWei('0');
            balance = web3.utils.fromWei(balance, 'ether');

            let instancePhotoNFTMarketplace = null;
            let instancePhotoNFTData = null;
            let PHOTO_NFT_MARKETPLACE;
            let deployedNetwork = null;

            // Create instance of contracts
            if (PhotoNFTMarketplace.networks) {
              deployedNetwork = PhotoNFTMarketplace.networks[networkId.toString()];
              if (deployedNetwork) {
                instancePhotoNFTMarketplace = new web3.eth.Contract(
                  PhotoNFTMarketplace.abi,
                  deployedNetwork && deployedNetwork.address,
                );
                PHOTO_NFT_MARKETPLACE = deployedNetwork.address;
                console.log('=== instancePhotoNFTMarketplace ===', instancePhotoNFTMarketplace);
              }
            }

            if (PhotoNFTData.networks) {
              deployedNetwork = PhotoNFTData.networks[networkId.toString()];
              if (deployedNetwork) {
                instancePhotoNFTData = new web3.eth.Contract(
                  PhotoNFTData.abi,
                  deployedNetwork && deployedNetwork.address,
                );
                console.log('=== instancePhotoNFTData ===', instancePhotoNFTData);
              }
            }

            if (instancePhotoNFTMarketplace) {
                // Set web3, accounts, and contract to the state, and then proceed with an
                // example of interacting with the contract's methods.
                this.setState({ 
                    web3, 
                    ganacheAccounts, 
                    accounts, 
                    balance, 
                    networkId, 
                    networkType, 
                    hotLoaderDisabled,
                    isMetaMask, 
                    currentAccount: currentAccount,
                    photoNFTMarketplace: instancePhotoNFTMarketplace,
                    photoNFTData: instancePhotoNFTData,
                    PHOTO_NFT_MARKETPLACE: PHOTO_NFT_MARKETPLACE }, () => {
                      this.refreshValues(instancePhotoNFTMarketplace);
                      setInterval(() => {
                        this.refreshValues(instancePhotoNFTMarketplace);
                    }, 5000);
                });
            }
            else {
              this.setState({ web3, ganacheAccounts, accounts, balance, networkId, networkType, hotLoaderDisabled, isMetaMask });
            }

            ///@dev - NFT（Always load listed NFT data
            const allPhotos = await this.getAllPhotos();
            this.setState({ allPhotos: allPhotos })
          }
        } catch (error) {
          // Catch any errors for any of the above operations.
          alert(
            `Failed to load web3, accounts, or contract. Check console for details.`,
          );
          console.error(error);
        }
    };

    componentWillUnmount() {
        if (this.interval) {
          clearInterval(this.interval);
        }
    }

    refreshValues = (instancePhotoNFTMarketplace) => {
        if (instancePhotoNFTMarketplace) {
          console.log('refreshValues of instancePhotoNFTMarketplace');
        }
    }

    render() {
        const { web3, allPhotos, currentAccount } = this.state;

        return (
            <div className={styles.contracts}>
             

              { this.state.loading==true?
                               <div style={{alignItems: "center", backgroundColor: "#d3d7f0",  borderRadius: "10px", boxShadow: "5px 5px 5px #a4a8bf"}}>
                                 {this.state.confirm == false? 
                               <div style={{padding: "20px 20px 20px 20px "}}>
                               <center>
                  
                                 <p><b><i>Note: Kindly confirm all three transactions in metamask</i></b></p>
                                 <br></br>
                                 <h3>Transactions in progress</h3>
                               
                               <Loader
                               type="Grid"
                               color="#3c4653"
                               size = "50px"
                               timeout={3000} //3 secs
                             />
                             <br></br>
                             <h4>Please wait...</h4>
                             </center>
                             </div>
                             :
                             <div style={{ position: "relative",  borderRadius: "10px", boxShadow: "5px 5px 5px #a4a8bf"}} >
                             <center>
                               <div  style={{padding: "20px 20px 20px 20px" , borderRadius: "10px", boxShadow: "5px 5px 5px #a4a8bf"}}>
                             <h2> Transaction Confirmed </h2>
                             <img src="https://cdn.pixabay.com/photo/2016/03/31/14/37/check-mark-1292787_960_720.png"  height = "150px" width = "150px" alt="Confirmed"/>
                             <br></br> <br></br>
                           <Button backgroundColor = "#3c4653" onClick = {this.nextPublish} size={'medium'} type='submit'>Publish a new photograph</Button> 
                           </div>
                           </center>
                           </div>
                             }
                             </div> :
                             
                             <div>
                                <h2>My Photos</h2>




              { allPhotos.map((photo, key) => {
                return (
                  <div key={key} className="">
                    <div className={styles.widgets}>

                        { currentAccount == photo.ownerAddress ? 
                            <Card width={"360px"} 
                                    maxWidth={"360px"} 
                                    mx={"auto"} 
                                    my={5} 
                                    p={20} 
                                    borderColor={"#E8E8E8"}
                            >
                              <Image
                                alt="random unsplash image"
                                borderRadius={8}
                                height="100%"
                                maxWidth='100%'
                                src={ `https://ipfs.io/ipfs/${photo.ipfsHashOfPhoto}` }
                              />

                              <span style={{ padding: "20px" }}></span>

                              <p>Photo Name: { photo.photoNFTName }</p>

                              <p>Price: { web3.utils.fromWei(`${photo.photoPrice}`, 'ether') } ETH</p>

                              <p>Owner: { photo.ownerAddress }</p>
                              
                              <br />

                              { photo.status == "Cancelled" ? 
                                  <Button backgroundColor = "#6ead21" size={'medium'} width={1} value={ photo.photoNFT } onClick={() => this.putOnSale(photo.photoNFT)}> Put on sale </Button>
                              :
                                  <Button backgroundColor ="#ff4040" size={'medium'} width={1} value={ photo.photoNFT } onClick={() => this.cancelOnSale(photo.photoNFT)}> Cancel on sale </Button>
                              }

                              <span style={{ padding: "5px" }}></span>
                            </Card>
                        :
                            ''
                        }
            
                    </div>
                  </div>
                  
                )
              }) }
              </div> 
              }</div>
            
        );
    }
}
