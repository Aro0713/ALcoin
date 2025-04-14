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
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/alcoin-bg.webp')" }}
    >
      <div className="min-h-screen backdrop-blur-md bg-black/60 flex flex-col items-center justify-between p-4">
        <div className="w-full max-w-6xl bg-yellow-400/40 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 text-black">
          {/* LOGO */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="flex justify-center mb-6"
          >
            <img
              src="/logo-alcoin.png"
              alt="ALcoin Logo"
              className="h-20 sm:h-24 md:h-[130px] w-auto drop-shadow-xl"
            />
          </motion.div>
  
          {/* SELECT JĘZYKA */}
          <div className="flex justify-end mb-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="p-2 rounded border text-black"
            >
              <option value="PL">PL</option>
              <option value="EN">EN</option>
              <option value="UA">UA</option>
            </select>
          </div>
  
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kolumna 1: Zakup + BuyBack */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <section>
                <p className="mb-4 text-base sm:text-lg font-extrabold tracking-wide uppercase text-center bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 bg-clip-text text-transparent animate-pulse">
                  Promocja: -15% od ceny ETH!
                </p>
                <p className="mb-2">
                  Twój adres:{" "}
                  <span className="font-mono text-blue-600">
                    {walletAddress || "(niepołączony)"}
                  </span>
                </p>
                <p className="mb-4">
                  Saldo ALcoin: <strong>{alcBalance}</strong> ALC
                </p>
  
                {!walletAddress && (
                  <button
                    onClick={connectWallet}
                    className="mb-4 px-4 py-3 bg-yellow-500 text-black font-bold rounded-xl shadow hover:bg-yellow-600 hover:shadow-lg transition text-base sm:text-lg"
                  >
                    Połącz portfel
                  </button>
                )}
  
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full mb-4 p-2 border rounded-xl text-right text-black"
                />
                <p className="mb-4">
                  Koszt: <strong>{cost}</strong> ETH
                </p>
                <button
                  onClick={buyTokens}
                  className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl shadow hover:bg-yellow-600 hover:shadow-lg transition text-base sm:text-lg"
                >
                  Kup Tokeny
                </button>
              </section>
  
              <section>
                <h2 className="text-xl font-semibold mb-2">🚀 BuyBack</h2>
                <button
                  onClick={buyBack}
                  className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl shadow hover:bg-yellow-600 hover:shadow-lg transition text-base sm:text-lg"
                >
                  Sprzedaj tokeny do kontraktu
                </button>
              </section>
            </motion.div>
  
            {/* Kolumna 2: Staking + Dywidendy + Admin */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <section>
                <h2 className="text-xl font-semibold mb-2">📦 Staking</h2>
                <p>
                  Aktualnie stakowane: <strong>{stakingBalance}</strong> ALC
                </p>
                <input
                  type="number"
                  value={stakingAmount}
                  onChange={(e) => setStakingAmount(e.target.value)}
                  className="w-full mb-2 p-2 border rounded-xl text-right text-black"
                />
                <button
                  onClick={stake}
                  className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl shadow hover:bg-yellow-600 hover:shadow-lg transition text-base sm:text-lg"
                >
                  Stake
                </button>
                <button
                  onClick={unstake}
                  className="w-full mt-2 bg-yellow-600 text-black font-bold py-3 rounded-xl shadow hover:bg-yellow-700 hover:shadow-lg transition text-base sm:text-lg"
                >
                  Unstake + Odbierz nagrody
                </button>
              </section>
  
              <section>
                <h2 className="text-xl font-semibold mb-2">📈 Dywidendy</h2>
                <p>Szacunkowa roczna dywidenda: {dividend} ALC</p>
                <p>Dni do kolejnej wypłaty: {daysLeft}</p>
                <button
                  onClick={claimDividend}
                  className="mt-2 bg-yellow-500 text-black font-bold px-4 py-3 rounded-xl shadow hover:bg-yellow-600 hover:shadow-lg transition text-base sm:text-lg"
                >
                  Wypłać Dywidendę
                </button>
              </section>
  
              {walletAddress === contractOwner && (
                <section>
                  <h2 className="text-xl font-semibold mb-2">🛡️ Panel Admina</h2>
                  <input
                    type="text"
                    placeholder="Adres inwestora"
                    value={newInvestor}
                    onChange={(e) => setNewInvestor(e.target.value)}
                    className="w-full mb-2 p-2 border rounded-xl text-black"
                  />
                  <button
                    onClick={addToWhitelist}
                    className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl shadow hover:bg-yellow-600 hover:shadow-lg transition text-base sm:text-lg"
                  >
                    Dodaj do whitelisty
                  </button>
                  {adminMessage && (
                    <p className="mt-2 text-sm text-gray-800">{adminMessage}</p>
                  )}
                </section>
              )}
            </motion.div>
          </div>
        </div>
  
        {/* STOPKA */}
        <footer className="mt-6 text-center text-xs text-gray-300">
  © {new Date().getFullYear()} ALcoin – Wszelkie prawa zastrzeżone.  
  Strona ma charakter informacyjny i nie stanowi oferty w rozumieniu przepisów Kodeksu Cywilnego.  
  Inwestycje w kryptowaluty wiążą się z ryzykiem. Przed podjęciem decyzji zapoznaj się z  
  <a
    href="https://alsolution.pl/produkty-1/token-alcoin"
    target="_blank"
    rel="noopener noreferrer"
    className="text-yellow-300 underline ml-1"
  >
    dokumentacją kontraktu
  </a>.
</footer>

      </div>
    </div>
  );
 
}
