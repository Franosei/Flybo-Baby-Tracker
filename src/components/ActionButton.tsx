import type { ReactNode } from 'react';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  tone: 'feed' | 'wee' | 'poop';
}

const ActionButton = ({ label, onClick, icon, tone }: ActionButtonProps) => (
  <button type="button" className={`action-button action-button--${tone}`} onClick={onClick}>
    <span className="action-icon">{icon}</span>
    <span>{label}</span>
  </button>
);

export default ActionButton;
