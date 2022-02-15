import React, {useEffect, useState} from "react";
import styles from './mint.module.scss'
import { useWeb3Modal } from "../hooks/web3Modal";
import {Modal} from "../components/modal";
import { ellipseAddress } from "../utils/chainHelpers";
import { contractConfig } from "../config/const";


const Mint: React.FC = () => {
    const [errorMsg,setErrorMsg] = useState<string | null>(null);
    const [amount, setAmount] = useState(1);

    const {
        //chainData,
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
        isContractConnected
    } = useWeb3Modal();

    useEffect(()=>{
        if(error){
            setErrorMsg(error)
        } else {
            setErrorMsg(null)
        }
    },[error])

    const inputHandler = (e: any) =>{
        if(e?.target?.value*mintData?.cost>balance){
            const max = Math.floor(balance/mintData?.cost)
            const maxAvailable = mintData?.max>max ? max : mintData?.max;
            setAmount(maxAvailable)
            setModalError(`Your balance allows you to create only ${maxAvailable} nft`)
            return;
        }
        if(Number(e?.target?.value)<=0){
            setAmount(1)
            return ;
        } else {
            if(Number(e?.target?.value)>mintData?.max){
                setAmount(mintData?.max)
                setModalError(`Only ${mintData?.max} nft available for this address per 1 mint`)
                return ;
            }
        }
        setAmount(+e?.target?.value)
    }

    const mintHandle = () =>{
        if(!errorMsg && amount>0 && isContractConnected){
            Mint(amount).then(e=>setAmount(1))
        }
    }

    return <>
        <div
            className={styles.container}
        >
            {isLoading && <div
                className={styles.spinner}
            >
                <div
                    className={styles.loader}
                >Loading...</div></div>}
            {modalError && <Modal msg={modalError} onClose={e=>setModalError(null)}/>}
            <div
                className={styles.wrapper}
            >
                <div
                    className={styles.connectButton}
                    onClick={address ? disconnect : connect}>
                    {address ? `${ellipseAddress(address,4)} DISCONNECT` : 'CONNECT'}
                </div>
                <div className={styles.mintControl}>
                    <input
                        value={amount}
                        className={styles.input}
                        type="number"
                        onInput={inputHandler}
                        disabled={!!error || !isContractConnected}/>
                    <button
                        className={styles.button}
                        onClick={mintHandle}
                        disabled={!!errorMsg || amount<0 || !isContractConnected}
                    >MINT</button>
                </div>
                <div className={styles.error}>{errorMsg}</div>
                <div className={styles.link}>
                    Contract link:
                    <a
                        href={`https://etherscan.io/address/${contractConfig.address}#code`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {contractConfig.address}
                    </a>
                </div>
            </div>
        </div>
    </>;
};

export default Mint;
