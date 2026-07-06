import React from 'react';
import Typography from '@/components/atoms/Typography';

interface TierHeaderProps {
  baseSpeed: number;
}

const TierHeader: React.FC<TierHeaderProps> = ({ baseSpeed }) => {
  return (
    <div className="bg-inset px-4 py-2 border-b border-line">
      <Typography variant="h2">Base {baseSpeed}</Typography>
    </div>
  );
};

export default TierHeader;
