import React, {useEffect, useState} from "react";
import styles from './mint.module.scss'
import { useWeb3Modal } from "../hooks/web3Modal";
import {Modal} from "../components/modal";
import { ellipseAddress } from "../utils/chainHelpers";
import { contractConfig } from "../config/const";
import logo from '../assets/img/logo.png';
import img1 from '../assets/img/img1.jpg';
import img2 from '../assets/img/img2.png';
import img3 from '../assets/img/img3.png';
import img4 from '../assets/img/img4.png';
import img5 from '../assets/img/img5.png';
import img6 from '../assets/img/img6.png';
import {ReactComponent as Twitter} from "../assets/icons/twitter-brands.svg";
import {ReactComponent as Insta} from "../assets/icons/instagram-brands.svg";
import {ReactComponent as Discord} from "../assets/icons/discord-brands.svg";

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
            <div className={styles.header}>
                <img className={styles.logo} src={logo} alt="Logo" />
                <a className={styles.home} href="https://chaoticdjs.com/" target={'_blank'} rel="noreferrer">HOME</a>
                <div className={styles.iconGroup}>
                    <a href="http://twitter.com/chaoticdjs" target={'_blank'} rel="noreferrer"><Twitter /></a>
                    <a href="http://instagram.com/chaoticdjs" target={'_blank'} rel="noreferrer"><Insta /></a>
                    <a href="https://discord.gg/VRZkskRH46" target={'_blank'} rel="noreferrer"><Discord /></a>
                </div>
                <button
                    className={styles.connectButton}
                    onClick={address ? disconnect : connect}>
                    {address ? `${ellipseAddress(address,4)}` : 'CONNECT'}
                </button>
            </div>
            <div
                className={styles.wrapper}
            >
                <div className={styles.images}>
                    <img src={img1} alt={'nft1'}/>
                    <img src={img2} alt={'nft2'}/>
                    <img src={img3} alt={'nft3'}/>
                    <img src={img4} alt={'nft4'}/>
                    <img src={img5} alt={'nft5'}/>
                    <img src={img6} alt={'nft6'}/>
                </div>
                <div className={styles.mintControl}>
                    <div className={styles.mintInput}>
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
                </div>
            </div>
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
    </>;
};

export default Mint;
