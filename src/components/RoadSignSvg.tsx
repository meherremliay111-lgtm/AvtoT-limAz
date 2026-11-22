import React from 'react';
import { RoadSignItem } from '../data/roadSigns';

interface RoadSignSvgProps {
  sign: Pick<RoadSignItem, 'code' | 'shape' | 'bgColor' | 'borderColor' | 'textColor' | 'symbolText' | 'symbolType'>;
  size?: number;
  className?: string;
}

export const RoadSignSvg: React.FC<RoadSignSvgProps> = ({ sign, size = 64, className = '' }) => {
  const renderSymbol = () => {
    switch (sign.symbolType) {
      case 'speed_limit':
        return (
          <text x="50" y="59" textAnchor="middle" fontSize="34" fontWeight="800" fill="#0F172A">
            {sign.symbolText || '60'}
          </text>
        );
      case 'stop':
        return (
          <text x="50" y="58" textAnchor="middle" fontSize="24" fontWeight="900" fill="#FFFFFF" letterSpacing="1">
            STOP
          </text>
        );
      case 'no_entry':
        return <rect x="20" y="42" width="60" height="16" rx="2" fill="#FFFFFF" />;
      case 'no_traffic':
        return null;
      case 'no_stopping':
        return (
          <g stroke="#DC2626" strokeWidth="9" strokeLinecap="round">
            <line x1="25" y1="25" x2="75" y2="75" />
            <line x1="75" y1="25" x2="25" y2="75" />
          </g>
        );
      case 'no_parking':
        return <line x1="24" y1="24" x2="76" y2="76" stroke="#DC2626" strokeWidth="10" strokeLinecap="round" />;
      case 'no_overtake':
        return (
          <g>
            <rect x="26" y="40" width="18" height="22" rx="3" fill="#0F172A" />
            <rect x="55" y="40" width="18" height="22" rx="3" fill="#DC2626" />
          </g>
        );
      case 'no_overtake_end':
        return (
          <g>
            <rect x="26" y="40" width="18" height="22" rx="3" fill="#64748B" />
            <rect x="55" y="40" width="18" height="22" rx="3" fill="#64748B" />
            <line x1="22" y1="78" x2="78" y2="22" stroke="#0F172A" strokeWidth="6" />
          </g>
        );
      case 'no_uturn':
        return (
          <g>
            <path d="M 60 72 L 60 40 A 12 12 0 0 0 36 40 L 36 62" fill="none" stroke="#0F172A" strokeWidth="7" strokeLinecap="round" />
            <polygon points="28,56 44,56 36,70" fill="#0F172A" />
            <line x1="22" y1="22" x2="78" y2="78" stroke="#DC2626" strokeWidth="8" />
          </g>
        );
      case 'go_straight':
        return (
          <g fill="#FFFFFF">
            <rect x="45" y="34" width="10" height="44" rx="2" />
            <polygon points="50,18 33,40 67,40" />
          </g>
        );
      case 'go_right':
        return (
          <g fill="#FFFFFF">
            <rect x="24" y="45" width="42" height="10" rx="2" />
            <polygon points="80,50 58,33 58,67" />
          </g>
        );
      case 'roundabout_mand':
        return (
          <g fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round">
            <path d="M 50 26 A 24 24 0 1 0 74 50" />
            <polygon points="50,16 61,32 42,32" fill="#FFFFFF" stroke="none" />
          </g>
        );
      case 'bike_lane':
        return (
          <g fill="none" stroke="#FFFFFF" strokeWidth="4">
            <circle cx="33" cy="60" r="11" />
            <circle cx="67" cy="60" r="11" />
            <path d="M 33 60 L 47 42 L 62 42 L 67 60 M 47 42 L 52 60" />
          </g>
        );
      case 'pedestrian_warn':
      case 'pedestrian_cross':
        return (
          <g>
            <circle cx="50" cy={sign.shape === 'triangle' ? 45 : 30} r="5.5" fill="#0F172A" />
            <path
              d={
                sign.shape === 'triangle'
                  ? 'M 50 52 L 50 68 M 50 56 L 40 66 M 50 56 L 60 64 M 50 68 L 41 82 M 50 68 L 59 82'
                  : 'M 50 37 L 50 56 M 50 42 L 38 54 M 50 42 L 62 52 M 50 56 L 39 74 M 50 56 L 61 74'
              }
              stroke="#0F172A"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            {sign.symbolType === 'pedestrian_cross' && (
              <g fill="#0F172A">
                <rect x="25" y="77" width="12" height="5" />
                <rect x="44" y="77" width="12" height="5" />
                <rect x="63" y="77" width="12" height="5" />
              </g>
            )}
          </g>
        );
      case 'rail_barrier':
        return (
          <g stroke="#0F172A" strokeWidth="5" strokeLinecap="round">
            <line x1="32" y1="68" x2="68" y2="68" />
            <line x1="36" y1="54" x2="64" y2="54" />
            <line x1="40" y1="50" x2="40" y2="78" />
            <line x1="60" y1="50" x2="60" y2="78" />
          </g>
        );
      case 'equal_cross':
        return (
          <g stroke="#0F172A" strokeWidth="7" strokeLinecap="round">
            <line x1="38" y1="48" x2="62" y2="72" />
            <line x1="62" y1="48" x2="38" y2="72" />
          </g>
        );
      case 'roundabout_warn':
        return <circle cx="50" cy="61" r="13" fill="none" stroke="#0F172A" strokeWidth="5.5" strokeDasharray="16 6" />;
      case 'sharp_turn':
        return (
          <path d="M 38 78 L 38 56 Q 38 44 62 44" fill="none" stroke="#0F172A" strokeWidth="6.5" strokeLinecap="round" />
        );
      case 'slippery':
        return (
          <g fill="none" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round">
            <rect x="42" y="42" width="16" height="10" rx="2" fill="#0F172A" />
            <path d="M 43 56 Q 37 64 45 72 Q 52 78 43 83" />
            <path d="M 57 56 Q 51 64 59 72 Q 66 78 57 83" />
          </g>
        );
      case 'narrow_road':
        return (
          <g stroke="#0F172A" strokeWidth="5" strokeLinecap="round" fill="none">
            <path d="M 38 80 L 38 64 L 44 54 L 44 42" />
            <path d="M 62 80 L 62 64 L 56 54 L 56 42" />
          </g>
        );
      case 'road_works':
        return (
          <g fill="#0F172A">
            <circle cx="46" cy="48" r="4.5" />
            <path d="M 46 53 L 40 72 L 52 72 Z" />
            <polygon points="55,76 69,76 62,64" />
          </g>
        );
      case 'animals':
        return (
          <g fill="#0F172A">
            <rect x="38" y="55" width="22" height="11" rx="3" />
            <rect x="57" y="48" width="9" height="8" rx="2" />
            <rect x="40" y="66" width="4" height="11" />
            <rect x="54" y="66" width="4" height="11" />
          </g>
        );
      case 'main_road_end':
        return (
          <g stroke="#0F172A" strokeWidth="5">
            <line x1="30" y1="70" x2="70" y2="30" />
            <line x1="25" y1="65" x2="65" y2="25" />
          </g>
        );
      case 'oncoming_priority':
        return (
          <g>
            <line x1="38" y1="72" x2="38" y2="30" stroke="#DC2626" strokeWidth="7" strokeLinecap="round" />
            <polygon points="38,22 29,36 47,36" fill="#DC2626" />
            <line x1="62" y1="28" x2="62" y2="70" stroke="#0F172A" strokeWidth="7" strokeLinecap="round" />
            <polygon points="62,78 53,64 71,64" fill="#0F172A" />
          </g>
        );
      case 'my_priority':
        return (
          <g>
            <line x1="36" y1="28" x2="36" y2="70" stroke="#DC2626" strokeWidth="7" strokeLinecap="round" />
            <polygon points="36,78 27,64 45,64" fill="#DC2626" />
            <line x1="64" y1="72" x2="64" y2="30" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
            <polygon points="64,22 55,36 73,36" fill="#FFFFFF" />
          </g>
        );
      case 'motorway':
        return (
          <g fill="#FFFFFF">
            <polygon points="34,78 44,24 47,24 41,78" />
            <polygon points="66,78 56,24 53,24 59,78" />
            <rect x="24" y="45" width="52" height="7" rx="1" />
          </g>
        );
      case 'one_way':
        return (
          <g fill="#FFFFFF">
            <rect x="43" y="38" width="14" height="44" />
            <polygon points="50,16 30,42 70,42" />
          </g>
        );
      case 'parking':
        return (
          <text x="50" y="66" textAnchor="middle" fontSize="50" fontWeight="800" fill="#FFFFFF">
            P
          </text>
        );
      case 'bus_stop':
        return (
          <g fill="#0F172A">
            <rect x="30" y="32" width="40" height="28" rx="4" />
            <rect x="34" y="36" width="32" height="12" fill="#BAE6FD" />
            <circle cx="38" cy="64" r="4" />
            <circle cx="62" cy="64" r="4" />
          </g>
        );
      case 'living_zone':
        return (
          <g fill="#FFFFFF">
            <polygon points="24,42 36,28 48,42" />
            <rect x="28" y="42" width="16" height="18" />
            <circle cx="65" cy="40" r="5" />
            <line x1="65" y1="45" x2="65" y2="66" stroke="#FFFFFF" strokeWidth="4" />
          </g>
        );
      case 'first_aid':
        return (
          <g fill="#DC2626">
            <rect x="44" y="28" width="12" height="44" />
            <rect x="28" y="44" width="44" height="12" />
          </g>
        );
      case 'fuel':
        return (
          <g fill="#0F172A">
            <rect x="35" y="30" width="24" height="40" rx="3" />
            <rect x="39" y="35" width="16" height="12" fill="#FFFFFF" />
            <path d="M 59 38 L 67 44 L 67 64 L 60 64" fill="none" stroke="#0F172A" strokeWidth="4" />
          </g>
        );
      case 'service':
        return (
          <path
            d="M 35 68 L 62 41 A 9 9 0 1 0 54 33 L 27 60 Z"
            fill="#0F172A"
          />
        );
      case 'rest_area':
        return (
          <g fill="#0F172A">
            <polygon points="32,48 50,30 68,48" />
            <rect x="47" y="48" width="6" height="24" />
          </g>
        );
      case 'dist_plate':
      case 'novice':
      case 'training_car':
        return (
          <text
            x="50"
            y={sign.shape === 'triangle' ? 72 : 58}
            textAnchor="middle"
            fontSize={sign.symbolText && sign.symbolText.length > 2 ? '22' : '38'}
            fontWeight="800"
            fill="#0F172A"
          >
            {sign.symbolText || '!'}
          </text>
        );
      case 'main_dir_plate':
        return (
          <g stroke="#0F172A" strokeLinecap="round" fill="none">
            <path d="M 50 78 L 50 50 L 76 50" strokeWidth="10" />
            <path d="M 50 50 L 50 22" strokeWidth="3.5" />
            <path d="M 24 50 L 50 50" strokeWidth="3.5" />
          </g>
        );
      case 'rain_plate':
        return (
          <g stroke="#0F172A" strokeWidth="4" strokeLinecap="round">
            <path d="M 30 42 Q 50 28 70 42" fill="#94A3B8" />
            <line x1="36" y1="54" x2="32" y2="70" />
            <line x1="50" y1="54" x2="46" y2="70" />
            <line x1="64" y1="54" x2="60" y2="70" />
          </g>
        );
      case 'hazard_triangle':
        return <polygon points="50,36 72,74 28,74" fill="none" stroke="#DC2626" strokeWidth="5" />;
      default:
        return null;
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-label={sign.code}>
      {sign.shape === 'circle' && (
        <circle cx="50" cy="50" r="44" fill={sign.bgColor} stroke={sign.borderColor} strokeWidth="9" />
      )}

      {sign.shape === 'triangle' && sign.symbolType === 'yield' && (
        <polygon
          points="8,14 92,14 50,88"
          fill={sign.bgColor}
          stroke={sign.borderColor}
          strokeWidth="9"
          strokeLinejoin="round"
        />
      )}

      {sign.shape === 'triangle' && sign.symbolType !== 'yield' && (
        <polygon
          points="50,10 92,86 8,86"
          fill={sign.bgColor}
          stroke={sign.borderColor}
          strokeWidth="9"
          strokeLinejoin="round"
        />
      )}

      {sign.shape === 'diamond' && (
        <g>
          <polygon points="50,6 94,50 50,94 6,50" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3" />
          <polygon points="50,20 80,50 50,80 20,50" fill={sign.bgColor} />
        </g>
      )}

      {sign.shape === 'octagon' && (
        <polygon
          points="31,8 69,8 92,31 92,69 69,92 31,92 8,69 8,31"
          fill={sign.bgColor}
          stroke={sign.borderColor}
          strokeWidth="5"
        />
      )}

      {(sign.shape === 'square' || sign.shape === 'rect') && (
        <g>
          <rect x="8" y="8" width="84" height="84" rx="8" fill={sign.bgColor} stroke={sign.borderColor} strokeWidth="4" />
          {sign.bgColor === '#0284C7' &&
            (sign.symbolType === 'pedestrian_cross' ||
              sign.symbolType === 'first_aid' ||
              sign.symbolType === 'fuel' ||
              sign.symbolType === 'service' ||
              sign.symbolType === 'rest_area' ||
              sign.symbolType === 'bus_stop') && (
              <rect x="20" y="20" width="60" height="60" rx="4" fill="#FFFFFF" />
            )}
        </g>
      )}

      {sign.shape === 'plate' && (
        <rect x="6" y="22" width="88" height="56" rx="5" fill={sign.bgColor} stroke={sign.borderColor} strokeWidth="4" />
      )}

      {renderSymbol()}
    </svg>
  );
};
