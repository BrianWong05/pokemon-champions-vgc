import React from 'react';
import Typography from '@/components/atoms/Typography';

interface SpeedTierTemplateProps {
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
}

const SpeedTierTemplate: React.FC<SpeedTierTemplateProps> = ({ 
  title, 
  children, 
  isLoading = false, 
  isEmpty = false, 
  emptyMessage = 'No data found.' 
}) => {
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-xl font-medium text-gray-600 animate-pulse">
          Loading speed tiers...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Typography variant="h1" className="mb-8 text-center">
        {title}
      </Typography>
      
      {isEmpty ? (
        <div className="text-center py-12 text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-8">
          {children}
        </div>
      )}
    </div>
  );
};

export default SpeedTierTemplate;
