import React from 'react';
import Typography from '@/components/atoms/Typography';

interface TierHeaderProps {
  baseSpeed: number;
}

const TierHeader: React.FC<TierHeaderProps> = ({ baseSpeed }) => {
  return (
    <div className="bg-gray-100 px-4 py-2 border-b">
      <Typography variant="h2">Base {baseSpeed}</Typography>
    </div>
  );
};

export default TierHeader;
