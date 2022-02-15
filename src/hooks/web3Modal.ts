import WalletConnectProvider from "@walletconnect/web3-provider";
import Web3Modal from 'web3modal';
import {useCallback, useEffect, useState} from "react";
import {providers} from "ethers";
import {getChainData} from "../utils/chainHelpers";
import {contractConfig} from "../config/const";
import Web3 from 'web3'

const INFURA_ID = '460f40a260564ac4a4f4b3fffb032dad'

const providerOptions = {
    walletconnect: {
        package: WalletConnectProvider, // required
        options: {
            infuraId: INFURA_ID, // required
        },
    },
}

let web3Modal: any;
if (typeof window !== 'undefined') {
    web3Modal = new Web3Modal({
        network: 'mainnet', // optional
        cacheProvider: true,
        providerOptions, // required
    })
}

type StateType = {
    signer: any,
    provider?: any,
    web3Provider?: any,
    address?: string | null,
    chainId?: number,
    error: string | null,
    web3: any,
    balance: any,
}

const initialState: StateType = {
    signer: null,
    provider: null,
    web3Provider: null,
    address: null,
    chainId: undefined,
    error: 'Connect your wallet',
    web3: null,
    balance: null,
}

interface IContractState {
    contract: any;
    privateMethods: any | null;
    publicMethods: any | null;
}

interface IMintState {
    max: number,
    cost: number,
}

export function useWeb3Modal () {
    const [state, setState] = useState<StateType>(initialState);
    const [modalError, setModalError] = useState<string | null>(null);
    const [mintData, setMintData] = useState<IMintState>({max:0,cost:0});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [currentContract, setCurrentContract] = useState<IContractState>({
        contract: null,
        privateMethods: null,
        publicMethods: null,
    });
    const { provider, address, chainId ,error,balance } = state;

    const switchNetwork = async (provider :any) =>{
            const params = [{chainId: Web3.utils.toHex(contractConfig.chainId) }]
            const tx = await provider.request({method: 'wallet_switchEthereumChain', params})
                .catch()
            if (tx) {
                console.log(tx)
            }
    }

    const connect = useCallback(async function () {

        let error: string | null  = null;
        try{
            const provider = await web3Modal.connect()
            const web3Provider = new providers.Web3Provider(provider)
            const web3 = new Web3(provider);

            const signer = web3Provider.getSigner()
            const address = await signer.getAddress()
            const balance = await web3.eth.getBalance(address);
            const network = await web3Provider.getNetwork();
            const chainInfo = getChainData(contractConfig.chainId)
            if(network.chainId!==contractConfig.chainId) {
                console.log(chainInfo);
                setModalError (`Please switch network to ${chainInfo?.name}`)
                await switchNetwork(provider);
                setState((prev)=>({
                    ...prev,
                    provider,
                    web3Provider,
                    chainId: network.chainId,
                    error,
                    web3,
                }))
            } else {
                setState((prev)=>({
                    ...prev,
                    signer,
                    provider,
                    web3Provider,
                    address,
                    chainId: network.chainId,
                    error,
                    web3,
                    balance
                }))
            }
        } catch (e) {
            setModalError('Could not get a wallet connection')
            console.log("Could not get a wallet connection", e);
            return;
        }
    }, [])

    const disconnect = useCallback(
        async function () {
            await web3Modal.clearCachedProvider()
            if (provider?.disconnect && typeof provider.disconnect === 'function') {
                await provider.disconnect()
            }
       setState(initialState)
        },
        [provider]
    )

    const getContractData = useCallback(async (contract:any) =>{
        let newState: any = {contract};
        try{
            await Promise.all(
                contractConfig.privateMethods.map(async el=>(
                    await contract.methods[el](address).call()
                ))
            ).then(res=>{
                const data: any = {};
                contractConfig.privateMethods.forEach((el,i)=>data[el]=
                    ((typeof(res[i] ) !=='boolean' )) ? Number(res[i]) : res[i])
                newState = {...newState, privateMethods: data}
            });

            await Promise.all(
                contractConfig.publicMethods.map(async el=>(
                    await contract.methods[el]().call()
                ))
            ).then(res=>{
                const data: any = {};
                contractConfig.publicMethods.forEach(
                    (el,i)=>data[el]=
                        ((typeof(res[i] ) !=='boolean' )) ? Number(res[i]) : res[i])
                newState = {...newState, publicMethods: data}
            });
            setCurrentContract((prev)=>({...prev,...newState}));
        } catch (e){
            console.log(e);
            setModalError('Contract not available')
            setState((prev)=>({...prev, error: 'Contract not available'}))

        }
    },[address])

    const getContract = useCallback(async () =>{
        try{
            if(state.web3){
                const contract = new state.web3.eth.Contract(contractConfig.abi,contractConfig.address);
                await getContractData(contract);
            }
        } catch (e) {
            setState((prev)=>({...prev, error: 'Contract config error'}))
        }

    },[state.web3,getContractData])

    useEffect(()=>{
        if(state.web3Provider && state.address && !error){
            getContract().then()
        }
    },[state.web3Provider,state.address,getContract,error]);


    //Contract permissions check

    useEffect(()=>{
        if(!address) return;
        if(currentContract.publicMethods){

            const now = (Date.now()/1000).toFixed(0);
            //check paused contract
            if(currentContract.publicMethods?.paused){
                setState((prev)=>({...prev, error: 'Contract paused'}))
                return ;
            }
            //check whitelist start time
            if(now<currentContract.publicMethods?.whiteListSaleStart){
                setState((prev)=>({...prev, error: 'Whitelist sale coming soon'}))
                return ;
            }
            //check whitelist rules
            if(currentContract.publicMethods?.whiteListSaleStart<now &&
                now<currentContract.publicMethods?.publicSaleStart){
                //check whitelist sold out
                if(currentContract.privateMethods.isWhitelistSoldOut){
                    setState((prev)=>({...prev, error: 'All whitelist nft is minted'}))
                    return ;
                }
                //check address whitelisted
                if(!currentContract.privateMethods.isWhitelisted){
                    setState((prev)=>({...prev, error: 'Your are not in whitelist'}))
                    return ;
                }
                //check address balance amount
                if(balance<currentContract.publicMethods.WHITELIST_COST){
                    setState((prev)=>({...prev, error: 'There are not enough funds on the wallet for the mint'}))
                    return ;
                }
                //check address whitelist available nft
                if(currentContract.privateMethods?.balanceOf>=currentContract.publicMethods?.MAX_MINT_AMOUNT_WHITELIST){
                    setState((prev)=>({...prev, error: 'You mint all whitelist nft'}))
                    return ;
                }

                setMintData((prev)=>({
                    ...prev,
                    max:currentContract.publicMethods?.MAX_MINT_AMOUNT_WHITELIST-currentContract.privateMethods?.balanceOf,
                    cost: currentContract.publicMethods?.WHITELIST_COST,
                }))
            }
            //check sale rules
            if(currentContract.publicMethods?.publicSaleStart<now){
                //check sold out
                if(currentContract.privateMethods.isSoldOut){
                    setState((prev)=>({...prev, error: 'All nft is minted'}))
                    return ;
                }
                //check address balance amount
                if(balance<currentContract.publicMethods.COST){
                    setState((prev)=>({...prev, error: 'There are not enough funds on the wallet for the mint'}))
                    return ;
                }
                //check address sale available nft
                if(Number(currentContract.privateMethods?.balanceOf)>=Number(currentContract.publicMethods?.ADDRESS_LIMIT)){
                    setState((prev)=>({...prev, error: 'You mint all nft'}))
                    return ;
                }
                const available = currentContract.publicMethods?.ADDRESS_LIMIT-currentContract.privateMethods?.balanceOf;

                setMintData((prev:any)=>({
                    ...prev,
                    max: available>currentContract.publicMethods?.MAX_MINT_AMOUNT ?
                        currentContract.publicMethods?.MAX_MINT_AMOUNT :
                        available,
                    cost: currentContract.publicMethods?.COST,
                }))
            }
        }
    },[
        currentContract,
        address,
        balance
    ])

    const Mint = async (value: number) =>{
        setIsLoading(true);
        await currentContract.contract?.methods?.mint(value)
            .send({
                from: address,
                to: contractConfig.address,
                value: value * mintData?.cost,
                gasLimit: contractConfig.gasLimit*value,
            })
            .on('receipt', function(receipt:any){
                getContractData(currentContract.contract).then()
                setIsLoading(false);
            })
            .on('error', function(error: any, receipt: any) {
                if(error.code && error.code===4001){
                    setModalError('User denied transaction signature.')
                } else {
                    setModalError('Contract connection error')
                }
                setIsLoading(false);
            });
    }

    useEffect(() => {
        if (web3Modal.cachedProvider) {
            connect().then()
        }
    }, [connect])

    useEffect(() => {
        if (provider?.on) {

            // const handleAccountsChanged = (accounts: string[]) => {
            //     if(accounts){
            //          setState((prev)=>({...prev,
            //             address: accounts[0],
            //         }))
            //     } else {
            //         window.location.reload()
            //     }
            // }

            const handleChainChanged = (_hexChainId: string) => {
                window.location.reload()
            }

            const handleDisconnect = (error: { code: number; message: string }) => {
                disconnect().then()
            }

            provider.on('accountsChanged', handleChainChanged)
            provider.on('chainChanged', handleChainChanged)
            provider.on('disconnect', handleDisconnect)

            // Subscription Cleanup
            return () => {
                if (provider.removeListener) {
                    provider.removeListener('accountsChanged', handleChainChanged)
                    provider.removeListener('chainChanged', handleChainChanged)
                    provider.removeListener('disconnect', handleDisconnect)
                }
            }
        }
    }, [provider, disconnect])

    const chainData = getChainData(chainId)
  return {
      chainData,
      address,
      connect,
      disconnect,
      error,
      mintData,
      Mint,
      isLoading,
      modalError,
      setModalError,
      balance,
      isContractConnected: !!currentContract.publicMethods
  };
}
