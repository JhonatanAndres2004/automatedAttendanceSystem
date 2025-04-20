// ImageButton.js
import React from 'react';

function ImageButton({ onClick, imageSrc, altText }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
      <img src={imageSrc} alt={altText} style={{ width: '30px', height: '30px' }} />
    </button>
  );
}

export default ImageButton;
