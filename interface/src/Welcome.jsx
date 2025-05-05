import { useEffect, useRef, useState } from "react";
import './Welcome.css';
const API_URL = import.meta.env.VITE_API_URL;

function Welcome({ onContinue }) {
  const [isCaptured, setIsCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error when accessing camera:", err);
      }
    };

    startCamera();
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageDataUrl);
      setIsCaptured(true);
    }
  };

  const retryPhoto = async () => {
    setIsCaptured(false);
    setCapturedImage(null);
    setVerificationResult(null);
    
    // Reset camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error initializing the camera:", err);
    }
  };

  const verifyFace = async () => {
    if (!capturedImage) return;

    setIsLoading(true);
    try {
      // Convert to base64 necessary for Rekognition
      let imageBase64 = capturedImage;
      if (capturedImage.includes('data:image')) {
        imageBase64 = capturedImage.split(',')[1];
      }
      const response = await fetch(`${API_URL}/compare-faces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          capturedImage: imageBase64
        })
      });

      const result = await response.json();
      setVerificationResult(result);

      if (result.matched) {
        setTimeout(() => {
          onContinue();
        }, 1500);
      }
    } catch (error) {
      console.error("Error during facial recognition:", error);
      setVerificationResult({
        matched: false,
        error: "Error connecting to the server"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="welcome-container">
      <div className="welcome-card">
        <div className="welcome-header">
          <img 
            src="https://www.uninorte.edu.co/o/uninorte-theme/images/uninorte/footer_un/logo.png" 
            alt="Logo Uninorte" 
            className="welcome-logo"
          />
          <h1 className="welcome-title">Facial Recognition Attendance System</h1>
        </div>

        <div className="video-box">
          {!isCaptured ? (
            <video ref={videoRef} autoPlay playsInline muted className="video" />
          ) : (
            <div className="captured-image-container">
              <img src={capturedImage} alt="Captured" className="captured-image" />
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <div className="welcome-message">
          <p className="welcome-paragraph">
            Welcome to the Attendance System. Please take a photo for facial verification.
          </p>

          <div className="buttons-container">
            {!isCaptured ? (
              <button 
                className="action-button active"
                onClick={takePhoto}
              >
                Take Photo
              </button>
            ) : (
              <>
                <button 
                  className="action-button retry"
                  onClick={retryPhoto}
                >
                  Try Again
                </button>
                <button 
                  className={`action-button verify ${isLoading ? 'loading' : ''}`}
                  onClick={verifyFace}
                  disabled={isLoading}
                >
                  {isLoading ? 'Verifying...' : 'Verify Face'}
                </button>
              </>
            )}
          </div>
        
          {verificationResult && (
            <div className={`verification-result ${verificationResult.matched ? 'success' : 'error'}`}>
              {verificationResult.matched ? (
                <p>✅ Verification successful! Redirecting...</p>
              ) : (
                <p>❌ Verification failed. {verificationResult.message || 'Please try again.'}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
//If verified. verificationResult changed state and the elements in attendance are rendered
export default Welcome;