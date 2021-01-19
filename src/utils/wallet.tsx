import React, { useContext, useEffect, useMemo, useState } from "react";
import Wallet from "@project-serum/sol-wallet-adapter";
import EzWallet from "@ezdefi/ezdefi-solala-wallet-adapter";
import { notify } from "./notifications";
import { useConnectionConfig } from "./connection";
import { useLocalStorageState } from "./utils";
import { SolongAdapter } from "./solong_adapter";

export const WALLET_PROVIDERS = [
  { name: "ezDeFi", url: "https://www.ezdefi.com" },
  { name: "sollet.io", url: "https://www.sollet.io" },
  { name: "solongwallet.com", url: "http://solongwallet.com" },
  { name: "solflare.com", url: "https://solflare.com/access-wallet" },
  { name: "mathwallet.org", url: "https://www.mathwallet.org" },
];

declare global {
  interface Window {
    solana:any;
  }
}

const WalletContext = React.createContext<any>(null);

export function WalletProvider({ children = null as any }) {
  const { endpoint } = useConnectionConfig();
  const [providerUrl, setProviderUrl] = useLocalStorageState(
    "walletProvider",
    "https://www.ezdefi.com"
  );

  //ezdefi provider configs
  const network = 'mainnet'
  const injectedPath = window.solana ? [window.solana,...Object.values(window.solana||{})].find((w: any) => {return w.name === 'ezdefi'}) : null

  const wallet = useMemo(() => {
    console.log("use new provider:", providerUrl, " endpoint:", endpoint);
    if (providerUrl === 'https://www.ezdefi.com') {
      if (!injectedPath) {
        notify({
          message: 'ezDeFi wallet is not installed.',
          description: '',
        });
        return new Wallet('https://www.sollet.io', endpoint);
      }
      return new EzWallet(providerUrl, network, injectedPath)
    } else if (providerUrl === "http://solongwallet.com") {
      return new SolongAdapter(providerUrl, endpoint);
    } else {
      return new Wallet(providerUrl, endpoint);
    }
  }, [providerUrl, endpoint, network, injectedPath]);

  const [connected, setConnected] = useState(false);
  useEffect(() => {
    console.log("trying to connect");
    wallet.on("connect", () => {
      console.log("connected");
      setConnected(true);
      let walletPublicKey = wallet.publicKey.toBase58();
      let keyToDisplay =
        walletPublicKey.length > 20
          ? `${walletPublicKey.substring(0, 7)}.....${walletPublicKey.substring(
              walletPublicKey.length - 7,
              walletPublicKey.length
            )}`
          : walletPublicKey;

      notify({
        message: "Wallet update",
        description: "Connected to wallet " + keyToDisplay,
      });
    });
    wallet.on("disconnect", () => {
      setConnected(false);
      notify({
        message: "Wallet update",
        description: "Disconnected from wallet",
      });
    });
    return () => {
      wallet.disconnect();
      setConnected(false);
    };
  }, [wallet]);
  return (
    <WalletContext.Provider
      value={{
        wallet,
        connected,
        providerUrl,
        setProviderUrl,
        providerName:
          WALLET_PROVIDERS.find(({ url }) => url === providerUrl)?.name ??
          providerUrl,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  return {
    connected: context.connected,
    wallet: context.wallet,
    providerUrl: context.providerUrl,
    setProvider: context.setProviderUrl,
    providerName: context.providerName,
  };
}
