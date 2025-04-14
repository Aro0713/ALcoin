// index.js
'use client'

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractJson from "../abi/ALcoin.json";
import { motion } from "framer-motion";

const abi = contractJson.abi;
const CONTRACT_ADDRESS = "0x4Cda22D1B7B98626F65340a2817242d29eF9EF1F";
const SECONDS_IN_YEAR = 365 * 24 * 3600;

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [alcBalance, setAlcBalance] = useState("0");
  const [amount, setAmount] = useState("10000");
  const [cost, setCost] = useState("0");
  const [contract, setContract] = useState(null);
  const [contractOwner, setContractOwner] = useState("");
  const [dividend, setDividend] = useState("0");
  const [daysLeft, setDaysLeft] = useState(null);
  const [stakingAmount, setStakingAmount] = useState("10000");
  const [stakingBalance, setStakingBalance] = useState("0");
  const [newInvestor, setNewInvestor] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [language, setLanguage] = useState("PL");
  const [recipient, setRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("10000");
  const [transferMessage, setTransferMessage] = useState("");
  const [recipientBalance, setRecipientBalance] = useState("");

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === "undefined") {
        alert("🦊 Zainstaluj MetaMask, aby połączyć portfel.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setWalletAddress(address);
      const alcoinContract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
      setContract(alcoinContract);

      const owner = await alcoinContract.owner();
      setContractOwner(owner);
    } catch (err) {
      console.error("❌ Błąd łączenia:", err);
      alert("❌ Nie udało się połączyć z portfelem.");
    }
  };

  const fetchBalance = async () => {
    if (contract && walletAddress) {
      const balance = await contract.balanceOf(walletAddress);
      setAlcBalance(ethers.formatUnits(balance, 18));
    }
  };

  const fetchCost = async () => {
    if (contract && amount) {
      try {
        const pricePerToken = await contract.getTokenPriceInETH();
        const discountedPrice = (BigInt(pricePerToken) * 85n) / 100n;
        const totalCost = (ethers.parseUnits(amount, 18) * discountedPrice) / ethers.parseUnits("1", 18);
        setCost(ethers.formatEther(totalCost));
      } catch (err) {
        console.error("❌ Błąd pobierania ceny:", err);
        setCost("0");
      }
    }
  };

  const buyTokens = async () => {
    if (!walletAddress || !contract) {
      alert("Połącz portfel najpierw.");
      return;
    }

    try {
      const amountBN = ethers.parseUnits(amount, 18);
      const tokenPrice = await contract.getTokenPriceInETH();
      const discountedPrice = tokenPrice * 85n / 100n;
      const totalCost = (amountBN * discountedPrice) / ethers.parseUnits("1", 18);

      const tx = await contract.buyTokens(amountBN, { value: totalCost });
      await tx.wait();

      alert("✅ Zakup zakończony sukcesem!");
      setAmount("10000");
      fetchBalance();
      fetchCost();
    } catch (err) {
      console.error("❌ Błąd podczas zakupu:", err);
      alert("❌ Nie udało się kupić tokenów.");
    }
  };

  const fetchLastDistribution = async () => {
    if (contract) {
      try {
        const last = await contract.lastDividendDistribution();
        const lastTime = Number(last);
        const now = Math.floor(Date.now() / 1000);
        const interval = SECONDS_IN_YEAR;
        const remaining = Math.max(interval - (now - lastTime), 0);
        setDaysLeft(Math.ceil(remaining / (24 * 3600)));

        const rawBalance = await contract.investorBalance(walletAddress);
        const balance = ethers.formatUnits(rawBalance, 18);
        const estimatedDividend = (parseFloat(balance) * 10) / 100;
        setDividend(estimatedDividend.toFixed(2));
      } catch (err) {
        console.error("Błąd dywidendy:", err);
      }
    }
  };

  const claimDividend = async () => {
    try {
      const tx = await contract.distributeDividends(0);
      await tx.wait();
      alert("✅ Dywidenda wypłacona!");
      fetchBalance();
    } catch (err) {
      console.error("❌ Błąd wypłaty dywidendy:", err);
    }
  };

  const fetchStakingBalance = async () => {
    if (contract && walletAddress) {
      const balance = await contract.stakingBalance(walletAddress);
      setStakingBalance(ethers.formatUnits(balance, 18));
    }
  };

  const stake = async () => {
    try {
      const amountBN = ethers.parseUnits(stakingAmount, 18);
      const tx = await contract.stakeTokens(amountBN);
      await tx.wait();
      alert("✅ Staking zakończony!");
      fetchStakingBalance();
    } catch (err) {
      console.error("❌ Błąd stakingu:", err);
    }
  };

  const unstake = async () => {
    try {
      const tx = await contract.unstakeTokens();
      await tx.wait();
      alert("✅ Unstaking zakończony!");
      fetchStakingBalance();
    } catch (err) {
      console.error("❌ Błąd unstakingu:", err);
    }
  };

  const addToWhitelist = async () => {
    if (!newInvestor || !ethers.isAddress(newInvestor)) {
      setAdminMessage("❌ Nieprawidłowy adres.");
      return;
    }

    try {
      const tx = await contract.addToWhitelist(newInvestor);
      await tx.wait();
      setAdminMessage(`✅ Dodano: ${newInvestor}`);
      setNewInvestor("");
    } catch (err) {
      console.error("Błąd dodawania:", err);
      setAdminMessage("❌ Błąd przy dodawaniu.");
    }
  };

  const buyBack = async () => {
    try {
      const amountBN = ethers.parseUnits(amount, 18);
      const tx = await contract.buyBackTokens(amountBN);
      await tx.wait();
      alert("✅ Tokeny odkupił kontrakt!");
      fetchBalance();
    } catch (err) {
      console.error("❌ Błąd odkupu:", err);
    }
  };

  const transferTokens = async () => {
    if (!ethers.isAddress(recipient)) {
      setTransferMessage("❌ Nieprawidłowy adres.");
      return;
    }
    try {
      const amount = ethers.parseUnits(transferAmount, 18);
      const tx = await contract.transfer(recipient, amount);
      await tx.wait();
      setTransferMessage(`✅ Wysłano ${transferAmount} ALC do ${recipient}`);
      setTransferAmount("10000");
      const recBalance = await contract.balanceOf(recipient);
      setRecipientBalance(ethers.formatUnits(recBalance, 18));
    } catch (err) {
      console.error("❌ Błąd transferu:", err);
      setTransferMessage("❌ Błąd podczas wysyłania.");
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    connectWallet();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchBalance();
    fetchCost();
    fetchLastDistribution();
    fetchStakingBalance();
  }, [contract, walletAddress, amount]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-yellow-100 to-yellow-300">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">💎 ALcoin - Panel</h1>
        <p className="mb-2">Twój adres: <span className="font-mono text-blue-700">{walletAddress || '(niepołączony)'}</span></p>
        <p className="mb-4">Saldo ALcoin: <strong>{alcBalance}</strong> ALC</p>

        {walletAddress === contractOwner && (
          <div className="mt-6 border-t pt-6">
            <h2 className="text-xl font-semibold mb-2">🎁 Wyślij ALcoin</h2>

            <input
              type="text"
              placeholder="Adres odbiorcy"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full mb-2 p-2 border rounded"
            />

            <input
              type="number"
              placeholder="Ilość ALC"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="w-full mb-2 p-2 border rounded"
            />

            <button
              onClick={transferTokens}
              className="w-full bg-yellow-500 text-black font-bold py-2 rounded hover:bg-yellow-600"
            >
              Wyślij ALcoin
            </button>

            {transferMessage && <p className="mt-2 text-sm text-gray-800">{transferMessage}</p>}

            {recipientBalance && (
              <p className="mt-2 text-sm text-green-700">
                Saldo odbiorcy po transferze: <strong>{recipientBalance}</strong> ALC
              </p>
            )}
          </div>
        )}

        <footer className="mt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} ALcoin – Wszelkie prawa zastrzeżone. <br />
          Inwestycje w kryptowaluty wiążą się z ryzykiem. Przed podjęciem decyzji zapoznaj się z <a className="text-blue-600 underline" href="https://alsolution.pl/produkty-1/token-alcoin" target="_blank">dokumentacją kontraktu</a>.
        </footer>
      </div>
    </div>
  );
}