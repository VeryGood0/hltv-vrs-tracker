import React, { useState, useEffect } from 'react';
import { Team } from '../types';

interface TeamLogoProps {
  team?: Team | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ team, size = 'md', className = '' }) => {
  const [imageError, setImageError] = useState(false);

  const logoSrc = team?.customLogo || team?.logoUrl;

  useEffect(() => {
    setImageError(false);
  }, [logoSrc]);

  if (!team) {
    return <div className="w-8 h-8 rounded-xl bg-slate-800" />;
  }

  // Derive acronym / monogram for fallback
  const getMonogram = (name?: string): string => {
    if (team?.shortName) return team.shortName;
    if (!name || typeof name !== 'string' || name.length === 0) return 'CS';
    if (name.length <= 4) return name.toUpperCase();
    if (name === 'BETBOOM') return 'BB';
    if (name === 'PARIVISION') return 'PV';
    if (name === 'Falcons') return 'FAL';
    if (name === 'Vitality') return 'VIT';
    if (name === 'Legacy') return 'LEG';
    if (name === 'Aurora') return 'AUR';
    if (name === 'Ninjas in Pyjamas') return 'NiP';
    if (name === 'ShindeN') return 'SDN';
    return name.slice(0, 3).toUpperCase();
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-base',
    xl: 'w-32 h-32 md:w-36 md:h-36 text-xl'
  }[size];

  const teamName = team.name || 'Team';
  const primaryColor = team.primaryColor || '#f59e0b';
  const secondaryColor = team.secondaryColor || '#141416';

  return (
    <div
      className={`relative flex items-center justify-center rounded-xl overflow-hidden shrink-0 select-none transition-all duration-300 ${sizeClasses} ${className}`}
      style={{
        backgroundColor: `${secondaryColor}ee`,
        boxShadow: size === 'xl' ? `0 0 35px ${primaryColor}25` : undefined
      }}
    >
      {!imageError && logoSrc ? (
        <img
          src={logoSrc}
          alt={`${teamName} logo`}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        // Stylized CS2 Esports Team Badge Fallback
        <div
          className="w-full h-full flex flex-col items-center justify-center p-1 border rounded-xl"
          style={{
            borderColor: `${primaryColor}40`,
            background: `radial-gradient(circle, ${primaryColor}18 0%, rgba(15,23,42,0.8) 100%)`
          }}
        >
          <div
            className="font-bold tracking-tighter leading-none"
            style={{ color: primaryColor }}
          >
            {getMonogram(teamName)}
          </div>
          {size === 'xl' && team.region && (
            <div className="mt-1 text-[9px] uppercase tracking-widest text-slate-400 font-mono">
              {team.region}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
