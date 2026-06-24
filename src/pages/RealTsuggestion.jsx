import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useStore } from "../store/useStore.js";
import { Captions, Search, AlertTriangle } from "lucide-react";
import toast from 'react-hot-toast';

const socket = io("http://localhost:5000");

const RealTsuggestion = () => {
  const [suggestions, setSuggestions] = useState([]); // Raw suggestions from backend
  const [displayedSuggestion, setDisplayedSuggestion] = useState(""); // Text being displayed with typing effect
  const [isTranscriptionMode, setIsTranscriptionMode] = useState(false);
  const containerRef = useRef(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [clientName, setClientName] = useState("");
  const [claimType, setClaimType] = useState("");
  const [claimID, setClaimID] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false); // State to track refresh status
  const [sentimentAlert, setSentimentAlert] = useState(null);

  const { searchedClaim, searchClaim } = useStore();

  const [formData, setFormData] = useState({
    claimID: "",
  });

  // Listen for new suggestions from the socket
  useEffect(() => {
    socket.on("new_suggestion", (data) => {
      const formattedResponse = data.response
        .split("\n")
        .map((line) => `${line}`)
        .join("\n");

      // Add the new suggestion to the list
      setSuggestions((prev) => {
        const newSuggestions = [formattedResponse, ...prev];
        return newSuggestions.length > 2 ? [formattedResponse] : newSuggestions;
      });

      // Start the typing effect for the new suggestion
      startTypingEffect(formattedResponse);
    });

    socket.on("sentiment_alert", (data) => {
      setSentimentAlert(data);
      toast.error(`SENTIMENT ALERT: ${data.message} (${data.score * 100}%)`, { duration: 6000, icon: '🚨' });
      // Clear alert banner after 10s
      setTimeout(() => setSentimentAlert(null), 10000);
    });

    return () => {
      socket.off("new_suggestion");
      socket.off("sentiment_alert");
    };
  }, []);

  // Scroll to the bottom of the suggestions container when new suggestions are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedSuggestion]);

  // Handle form submission for claim search
  const handleSubmit2 = async (e) => {
    e.preventDefault();
    searchClaim(formData.claimID);
  };

  // Handle form submission for new claim
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Call the backend endpoint to create a new claim
    const response = await fetch("http://localhost:5001/api/claims", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clientName, claimType }),
    });

    if (response.ok) {
      const data = await response.json();
      setClaimID(data.claimID);
    } else {
      console.error("Failed to create claim");
    }
  };

  // Toggle between transcription and claim info modes
  const toggleMode = () => {
    setIsTranscriptionMode(!isTranscriptionMode);
  };

  // Function to handle refresh memory
  const handleRefreshMemory = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("http://localhost:5000/refresh_history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        // Clear the current suggestion display
        setDisplayedSuggestion("");
        setSuggestions([]);
        // You could add a temporary success message here
        startTypingEffect(
          "Memory has been successfully refreshed. Ready for new conversation."
        );
      } else {
        console.error("Failed to refresh conversation history");
        startTypingEffect("Failed to refresh memory. Please try again.");
      }
    } catch (error) {
      console.error("Error refreshing conversation history:", error);
      startTypingEffect("An error occurred while refreshing memory.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to handle starting SAKSHAM
  const handleStartSaksham = async () => {
    try {
      const response = await fetch("http://localhost:5000/start_vat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message); // Handle success message
        startTypingEffect("SAKSHAM has been started successfully.");
      } else {
        console.error("Failed to start SAKSHAM");
        startTypingEffect("Failed to start SAKSHAM. Please try again.");
      }
    } catch (error) {
      console.error("Error starting SAKSHAM:", error);
      startTypingEffect("An error occurred while starting SAKSHAM.");
    }
  };

  // Typing effect logic
  const startTypingEffect = (text) => {
    setDisplayedSuggestion(""); // Clear the previous suggestion
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedSuggestion((prev) => {
        const newDisplayedText = text.slice(0, index);
        return newDisplayedText;
      });

      index++;
      if (index > text.length) {
        clearInterval(interval); // Stop the typing effect when complete
      }
    }, 10); // Adjust typing speed (milliseconds per character)
  };

  return (
    <div className="flex flex-row justify-evenly items-center h-screen z-1 font-dmsans">
      <div className="flex flex-col h-[90%] w-[60%] ml-[4rem] mt-[6rem]">
        {/* Sentiment Alert Banner */}
        {sentimentAlert && (
          <div className="w-[95%] ml-[3rem] mb-4 bg-red-900/80 border-2 border-red-500 p-4 rounded-2xl flex items-center gap-4 text-white animate-pulse shadow-[0_0_15px_#ef4444]">
            <AlertTriangle size={32} className="text-red-400" />
            <div>
              <h3 className="font-bold text-xl uppercase tracking-wider text-red-200">Critical Client Sentiment: {sentimentAlert.emotion}</h3>
              <p className="font-medium text-lg">{sentimentAlert.message}</p>
            </div>
          </div>
        )}

        {/* Suggestions Container */}
        <div className="h-[70%] w-[95%] ml-[3rem] bg-[rgba(0,0,0,0.7)] rounded-2xl flex flex-col">
          <div className="h-[4rem] w-full bg-[rgba(0,0,0,0.8)] flex justify-between items-center pl-[0.5rem] pr-[0.5rem] rounded-t-2xl font-bold text-white">
            <div className="pl-[1rem] pb-[0.5rem] text-2xl font-extrabold font-dmsans bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              RTS powered by SAKSHAM
            </div>
          </div>
          <div
            ref={containerRef}
            className="p-6 overflow-auto h-full font-medium text-lg"
          >
            {displayedSuggestion ? (
              <div>
                {displayedSuggestion.split("\n").map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            ) : (
              <div className="h-full w-full flex justify-center items-center size-[50%]">
                <div id="loader-wrapper">
                  <div id="loader"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buttons Container */}
        <div className="flex flex-row items-center justify-evenly bg-[rgba(0,0,0,0.7)] h-[17%] mt-[1rem] rounded-2xl w-[95%] ml-[3rem]">
          <div className="px-3 py-2 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-500">
            <button onClick={handleStartSaksham}>Start SAKSHAM</button>
          </div>
          <div className="px-3 py-2 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-500">
            <button onClick={handleRefreshMemory} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing..." : "Refresh Memory"}
            </button>
          </div>
          <div className="relative">
            {/* New Claim Button */}
            <div className="px-3 py-2 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-500 cursor-pointer">
              <button onClick={() => setIsFormVisible(!isFormVisible)}>
                New Claim
              </button>
            </div>

            {/* Hovering Div */}
            {isFormVisible && (
              <div className="absolute bottom-1 left-25 bg-[rgba(0,0,0,0.8)] p-4 rounded-lg shadow-lg w-64">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Client Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-white">
                      Client Name:
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Claim Type Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-white">
                      Claim Type:
                    </label>
                    <select
                      value={claimType}
                      onChange={(e) => setClaimType(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border bg-gray-900 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Claim Type</option>
                      <option value="medical">Medical</option>
                      <option value="financial">Financial</option>
                      {/* Add more claim types as needed */}
                    </select>
                  </div>

                  {/* Submit Button */}
                  <div>
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Submit
                    </button>
                  </div>
                </form>

                {/* Display Claim ID */}
                {claimID && (
                  <div className="mt-4 p-2 bg-[rgba(0,0,0,0.7)] rounded-md">
                    <p className="text-semibold text-white">
                      <span className="font-semibold text-green-400">
                        Claim ID:
                      </span>{" "}
                      {claimID}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Claim Info Container */}
      <div className="h-[80%] w-[30%] bg-[rgba(0,0,0,0.7)] rounded-2xl flex flex-col">
        {/* Toggle Button */}
        <div className="w-full h-15 bg-[rgba(0,0,0)] rounded-t-2xl flex justify-between items-center">
          <div className="pl-[1rem] pt-[0.5rem] text-2xl font-extrabold font-dmsans bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent">
            {isTranscriptionMode
              ? "Real-Time Transcription"
              : "Get Claim Information"}
          </div>
          <button
            onClick={toggleMode}
            className="mr-4 px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            {isTranscriptionMode
              ? "Switch to Claims"
              : "Switch to Transcription"}
          </button>
        </div>

        {/* Content */}
        {isTranscriptionMode ? (
          <div className="w-full h-full p-6">
            {/* Real-Time Transcription Content */}
            <div className="w-full h-full flex justify-center items-center pb-[4rem] mt-[1rem]">
              <div className="flex flex-col">
                <div className="text-gray-400 mx-auto text-xl font-medium mt-2 opacity-60">
                  <Captions className="size-50 opacity-50" />
                  Real-Time Transcription
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Search Form */}
            <div className="w-full p-3 flex flex-col">
              <form onSubmit={handleSubmit2} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Claim ID"
                  className="h-12 rounded-md bg-[rgb(0,0,0,0.8)] pl-3 border-none w-[88%] text-white"
                  value={formData.claimID}
                  onChange={(e) =>
                    setFormData({ ...formData, claimID: e.target.value })
                  }
                />
                <button
                  type="submit"
                  className="h-12 bg-green-700 text-white rounded-md hover:bg-green-900 transition-colors w-[10%] flex justify-center items-center"
                >
                  <Search />
                </button>
              </form>
            </div>

            {/* Claim Info */}
            <div className="w-full h-full p-6">
              {searchedClaim === null ? (
                <div className="w-full h-full flex justify-center items-center pb-[4rem]">
                  <div className="flex flex-col">
                    <div className="size-50 bg-cover">
                      <img src="/database.png" alt="database" />
                    </div>
                    <div className="text-gray-400 mx-auto text-xl font-medium mt-2 opacity-60">
                      Enter Claim ID to search
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-white font-bold">
                    Claim ID: {searchedClaim?.claimID || "N/A"}
                  </h3>
                  <br />
                  <p className="text-white">
                    Client Name: {searchedClaim?.clientName || "N/A"}
                  </p>
                  <br />
                  <p className="text-white">
                    Client Info: {searchedClaim?.clientSummary || "N/A"}
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RealTsuggestion;
