// index.js – pełna wersja z layoutem, tłem, logo i wszystkimi funkcjami
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
  const [basePriceETH, setBasePriceETH] = useState("0");

  const connectWallet = async () => {
    try {
      if (!window.ethereum) return alert("🦊 Zainstaluj MetaMask.");
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
      const alcoinContract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
      setContract(alcoinContract);
      const owner = await alcoinContract.owner();
      setContractOwner(owner);
      const balance = await alcoinContract.balanceOf(address);
      setAlcBalance(ethers.formatUnits(balance, 18));
    } catch (err) {
      console.error(err);
      alert("Nie udało się połączyć z portfelem.");
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
        setBasePriceETH(ethers.formatEther(pricePerToken));
      } catch (err) {
        console.error("❌ Błąd pobierania ceny:", err);
        setCost("0");
      }
    }
  };

  const buyTokens = async () => {
    if (!walletAddress || !contract) return alert("Połącz portfel najpierw.");
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

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    fetchBalance();
    fetchCost();
    fetchLastDistribution();
    fetchStakingBalance();
  }, [contract, walletAddress, amount]);

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: "url('/alcoin-bg.webp')" }}
    >
      <div className="min-h-screen backdrop-blur-md bg-black/60 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-6xl bg-white/10 rounded-xl shadow-xl p-6 text-white">
  
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="flex justify-center mb-6"
          >
            <img
              src="/logo-alcoin.png"
              alt="ALcoin Logo"
              className="h-24 w-auto drop-shadow-xl"
            />
          </motion.div>
  
          <button
            onClick={() =>
              window.open(
                "https://sepolia.etherscan.io/address/0x4Cda22D1B7B98626F65340a2817242d29eF9EF1F",
                "_blank"
              )
            }
            className="mb-6 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            🔗 Zobacz kontrakt na Etherscan
          </button>
  
          <div className="mb-4 text-sm">
            <p>
              Twój adres:{" "}
              <span className="font-mono text-blue-300">
                {walletAddress || "(niepołączony)"}
              </span>
            </p>
            <p>
              Saldo: <strong>{alcBalance}</strong> ALC
            </p>
          </div>
  
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">💰 Zakup Tokenów</h2>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border rounded text-black"
              />
              <p>
                Koszt: <strong>{cost}</strong> ETH
              </p>
              <p className="text-sm text-yellow-200">
                Cena emisyjna: 1 ALC = 0,28 USD
                <br />
                Wartość ALC w przedsprzedaży: 1 ALC = 0,238 USD
                <br />
                Wartość ALC w cenie emisyjnej = <strong>{basePriceETH}</strong> ETH
              </p>
              <button
                onClick={buyTokens}
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                Kup Tokeny
              </button>
  
              <h2 className="text-xl font-semibold">🔥 BuyBack</h2>
              <button
                onClick={buyBack}
                className="w-full bg-yellow-500 text-black py-2 rounded hover:bg-yellow-600"
              >
                Sprzedaj tokeny
              </button>
            </div>
  
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">📦 Staking</h2>
              <input
                type="number"
                value={stakingAmount}
                onChange={(e) => setStakingAmount(e.target.value)}
                className="w-full p-2 border rounded text-black"
              />
              <button
                onClick={stake}
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                Stake
              </button>
              <button
                onClick={unstake}
                className="w-full bg-yellow-500 text-black py-2 rounded hover:bg-yellow-600"
              >
                Unstake
              </button>
  
              <h2 className="text-xl font-semibold mt-6">📈 Dywidendy</h2>
              <p>Szacunkowa: {dividend} ALC</p>
              <p>Dni do wypłaty: {daysLeft}</p>
              <button
                onClick={claimDividend}
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                Wypłać
              </button>
  
              {walletAddress === contractOwner && (
                <div className="pt-6 border-t mt-6">
                  <h2 className="text-xl font-semibold mb-2">🛡️ Panel Admina</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Adres inwestora"
                        value={newInvestor}
                        onChange={(e) => setNewInvestor(e.target.value)}
                        className="w-full p-2 border rounded text-black"
                      />
                      <button
                        onClick={addToWhitelist}
                        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 mt-2"
                      >
                        Dodaj do whitelisty
                      </button>
                      {adminMessage && (
                        <p className="mt-1 text-sm text-white">{adminMessage}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Adres odbiorcy"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full p-2 border rounded text-black"
                      />
                      <input
                        type="number"
                        placeholder="Ilość ALC"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full p-2 border rounded text-black mt-2"
                      />
                      <button
                        onClick={transferTokens}
                        className="w-full bg-yellow-500 text-black py-2 rounded hover:bg-yellow-600 mt-2"
                      >
                        Wyślij ALcoin
                      </button>
                      {transferMessage && (
                        <p className="text-sm text-white mt-1">{transferMessage}</p>
                      )}
                      {recipientBalance && (
                        <p className="text-sm text-green-300">
                          Saldo odbiorcy: {recipientBalance} ALC
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
  
          <footer className="mt-10 text-center text-xs text-white/80">
            © {new Date().getFullYear()} ALcoin – Wszelkie prawa zastrzeżone. <br />
            Inwestycje w kryptowaluty wiążą się z ryzykiem. Przed podjęciem decyzji zapoznaj się z{' '}
            <a
              className="text-yellow-300 underline"
              href="https://alsolution.pl/produkty-1/token-alcoin"
              target="_blank"
            >
              dokumentacją kontraktu
            </a>.
          </footer>
        </div>
      </div>
    </div>
  )
  
}
