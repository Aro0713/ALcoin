import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractJson from "../abi/ALcoin.json";
const abi = contractJson.abi;

const CONTRACT_ADDRESS = "0x4Cda22D1B7B98626F65340a2817242d29eF9EF1F";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [alcBalance, setAlcBalance] = useState("0");
  const [amount, setAmount] = useState("10000");
  const [cost, setCost] = useState("0");
  const [contract, setContract] = useState(null);

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setWalletAddress(accounts[0]);

      const signer = await provider.getSigner();
      const alcoinContract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
      setContract(alcoinContract);
    }
  };

  const fetchBalance = async () => {
    if (contract && walletAddress) {
      try {
        const balance = await contract.balanceOf(walletAddress);
        setAlcBalance(ethers.formatUnits(balance, 18));
      } catch (err) {
        console.error("Błąd pobierania salda:", err);
      }
    }
  };

  const fetchCost = async () => {
    if (contract && amount) {
      try {
        const pricePerToken = await contract.getTokenPriceInETH();
        const discountedPrice = (BigInt(pricePerToken) * 85n) / 100n;
        const totalCost = (ethers.parseUnits(amount.toString(), 18) * discountedPrice) / ethers.parseUnits("1", 18);
        setCost(ethers.formatEther(totalCost));
      } catch (err) {
        console.error("Błąd pobierania ceny:", err);
      }
    }
  };

  const buyTokens = async () => {
    if (!walletAddress || !contract) {
      alert("Połącz portfel najpierw.");
      return;
    }

    try {
      const amountBN = ethers.parseUnits(amount.toString(), 18);
      const tokenPrice = await contract.getTokenPriceInETH();
      const discountedPrice = (BigInt(tokenPrice) * 85n) / 100n;

      const totalCost = (amountBN * discountedPrice) / ethers.parseUnits("1", 18);

      const tx = await contract.buyTokens(amountBN, { value: totalCost });
      await tx.wait();

      alert("✅ Zakup zakończony sukcesem!");
      setAmount("10000");
      fetchBalance();
    } catch (err) {
      console.error("❌ Błąd:", err);
      alert("❌ Błąd podczas zakupu.");
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [contract, walletAddress]);

  useEffect(() => {
    fetchCost();
  }, [contract, amount]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-2">💎 ALcoin - Zakup Tokenów</h1>

        <p className="mb-2 text-green-700 font-medium">
          Promocja: -15% od ceny ETH! 🌟
        </p>

        <p className="mb-2">
          Twój adres:{" "}
          <span className="font-mono text-blue-600">
            {walletAddress || "(niepołączony)"}
          </span>
        </p>

        <p className="mb-4">Saldo ALcoin: <strong>{alcBalance}</strong> ALC</p>

        {!walletAddress && (
          <button
            onClick={connectWallet}
            className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-xl shadow hover:bg-blue-600"
          >
            Połącz portfel
          </button>
        )}

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full mb-4 p-2 border rounded-xl text-right"
        />

        <p className="mb-4">Koszt: <strong>{cost}</strong> ETH</p>

        <button
          onClick={buyTokens}
          className="w-full bg-green-500 text-white py-2 rounded-xl hover:bg-green-600"
        >
          Kup Tokeny
        </button>
      </div>
    </div>
  );
}
