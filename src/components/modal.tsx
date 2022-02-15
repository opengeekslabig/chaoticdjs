import React from "react";
import styles from './modal.module.scss'

interface IProps {
    msg: string;
    onClose(val: any): void;
}

export const Modal: React.FC<IProps> = ({msg,onClose}) =>{
    return <div className={styles.modalWrapper}>
        <div className={styles.box}>
            <div className={styles.close} onClick={onClose}>X</div>
            {msg}
        </div>
    </div>
}
