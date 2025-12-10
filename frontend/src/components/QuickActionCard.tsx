import React from 'react';
import { Link } from 'react-router-dom';
import './QuickActionCard.css';

interface QuickActionCardProps {
  to: string;
  icon: string;
  iconBgClass?: string;
  title: string;
  description: string;
  actionText: string;
  testId?: string;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  to,
  icon,
  iconBgClass,
  title,
  description,
  actionText,
  testId,
}) => {
  return (
    <Link
      to={to}
      className="quick-action-card-link"
      data-testid={testId}
    >
      <div className="quick-action-card">
        <div className="quick-action-card-header">
          <div className={`quick-action-card-icon ${iconBgClass || ''}`}>
            {icon}
          </div>
          <h3 className="quick-action-card-title">{title}</h3>
        </div>
        <p className="quick-action-card-description">{description}</p>
        <div className="quick-action-card-action">{actionText} →</div>
      </div>
    </Link>
  );
};
