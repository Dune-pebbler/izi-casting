import React from "react";
import { ShieldAlert } from "lucide-react";

const DISCLAIMER_KEY = "izi_disclaimer_accepted";

export function hasAcceptedDisclaimer() {
  return localStorage.getItem(DISCLAIMER_KEY) === "true";
}

function DisclaimerModal({ onAccept }) {
  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_KEY, "true");
    onAccept();
  };

  return (
    <div className="disclaimer-modal-overlay">
      <div className="disclaimer-modal">
        <div className="disclaimer-modal-header">
          <h2>Disclaimer</h2>
        </div>
        <div className="disclaimer-modal-body">
          <div>
            <h2>Juridische Disclaimer: Verantwoordelijkheid Content</h2>
            <strong>Artikel: Gebruik en Contentbeheer</strong>
          </div>

          <p>
            Door gebruik te maken van het IZI-Casting platform, verklaart de
            Gebruiker expliciet akkoord te gaan met de volgende bepalingen
            omtrent content en publicatie:
          </p>

          <p>
            <strong>Eigen Verantwoordelijkheid:</strong> De Gebruiker draagt de
            volledige en exclusieve verantwoordelijkheid voor alle content die
            via het IZI-Casting systeem wordt gepubliceerd, waaronder begrepen
            maar niet beperkt tot teksten, afbeeldingen, audiofragmenten en
            video's (al dan niet afkomstig van platforms zoals YouTube en
            Vimeo).
          </p>

          <p>
            <strong>Rechten van Derden:</strong> De Gebruiker garandeert dat de
            gepubliceerde content geen inbreuk maakt op intellectuele
            eigendomsrechten (zoals auteursrechten, merkrechten of naburige
            rechten) van derden. Bij het gebruik van externe bronnen, zoals
            RSS-feeds of video-embeds, dient de Gebruiker zelf zorg te dragen
            voor de benodigde licenties of toestemmingen.
          </p>

          <p>
            <strong>Vrijwaring:</strong> De Gebruiker vrijwaart IZI-Casting (en
            haar ontwikkelaar: Dune Pebbler B.V.) tegen alle aanspraken van
            derden, evenals alle schade en kosten (inclusief juridische
            bijstand), die voortvloeien uit of verband houden met de door de
            Gebruiker geplaatste content.
          </p>

          <p>
            <strong>Onrechtmatige Content:</strong> Het is strikt verboden
            content te publiceren die in strijd is met de wet, de goede zeden,
            of die een discriminerend, beledigend of aanstootgevend karakter
            heeft. IZI-Casting behoudt zich het recht voor om bij overtreding de
            toegang tot het platform direct te blokkeren, zonder dat dit leidt
            tot enige plicht tot schadevergoeding jegens de Gebruiker.
          </p>

          <p>
            <strong>Externe Bronnen:</strong> IZI-Casting biedt technische
            koppelingen met externe diensten (o.a. RSS, YouTube, Vimeo,
            Teletekst). Wij aanvaarden geen enkele aansprakelijkheid voor de
            beschikbaarheid, juistheid of inhoud van deze externe bronnen.
          </p>
        </div>
        <div className="disclaimer-modal-footer">
          <button className="btn btn-primary" onClick={handleAccept}>
            Akkoord
          </button>
        </div>
      </div>
    </div>
  );
}

export default DisclaimerModal;
