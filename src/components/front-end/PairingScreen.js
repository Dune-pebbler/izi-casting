import React from "react";

function PairingScreen({ 
  displayPairingCode, 
  isCodeFlashing, 
  codeTimeRemaining, 
  pairingError 
}) {
  return (
    <div className="display-container pairing-screen">
      <div className="pairing-content">
        <div className="pairing-logo">
          <img src="/izicasting-logo.svg" alt="Izi Casting Logo" />
        </div>

        <div className="pairing-main">
          <h1 className="pairing-title">Apparaat koppelen</h1>

          <p className="pairing-instructions">
            Voer deze koppelcode in op het admin paneel
          </p>

          <div className="pairing-code-section">
            {displayPairingCode ? (
              <div className="pairing-code-display">
                <div
                  className={`pairing-code-value ${
                    isCodeFlashing ? "flashing" : ""
                  }`}
                >
                  {displayPairingCode.split("").map((digit, index) => (
                    <span key={index} className="pairing-code-digit">
                      {digit}
                    </span>
                  ))}
                </div>

                {/* Timer bar */}
                <div className="pairing-timer-container">
                  <div
                    className="pairing-timer-bar"
                    style={{
                      width: `${(codeTimeRemaining / 30) * 100}%`,
                      backgroundColor:
                        codeTimeRemaining <= 5 ? "#FF3B30" : "#f07167",
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="pairing-code-generating">
                <div className="loading-spinner"></div>
                <div className="generating-text">Code genereren...</div>
              </div>
            )}
          </div>

          {pairingError && <p className="pairing-error">{pairingError}</p>}
        </div>
      </div>
    </div>
  );
}

export default PairingScreen;
