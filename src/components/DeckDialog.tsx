import React from 'react';
import "../css/DeckDialog.css";

interface DeckDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeckDialog: React.FC<DeckDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null; // ダイアログが閉じている場合は何も表示しない
  }

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h2>Deck Information</h2>
        <p>ここにデッキの情報を表示します。</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default DeckDialog;

