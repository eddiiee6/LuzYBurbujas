import { Link } from 'react-router-dom';
import { useLookup } from '../data/CatalogContext';
import { availableTypes, displayColorId, money, typeLabel } from '../lib/rules';
import type { Mold } from '../types';
import { Stage } from './Stage';
import { coverPhoto } from '../lib/gallery';
import { FitPhoto } from './FitPhoto';

export function MoldCard({ mold }: { mold: Mold }) {
  const look = useLookup();
  const theme = look.collection.get(mold.collectionId)?.theme;
  const colorId = displayColorId(mold);
  const color = look.color.get(colorId)?.hex ?? '#f5a3c0';
  const types = availableTypes(mold);
  return (
    <Link to={`/personaliza?molde=${mold.slug}`} className="mold-card" style={{ ['--card-bg' as string]: theme?.bg ?? '#fde8f0' }}>
      <div className="mold-card-art">
        {coverPhoto(mold) ? (
          <FitPhoto className="card-photo" src={coverPhoto(mold)!.url} alt={mold.name} />
        ) : (
          <Stage bare mold={mold} type={types.includes('vela') ? 'vela' : 'jabon'} color={color} colorId={colorId} plate={null} veinColor={null} />
        )}
      </div>
      <div className="mold-card-body">
        <span className="eyebrow">{look.collection.get(mold.collectionId)?.name}</span>
        <h3>{mold.name}</h3>
        <div className="prices">
          {types.map((t) => (
            <span key={t} className="price-tag">
              {typeLabel[t]} <b>{money(mold.prices[t] ?? 0)}</b>
            </span>
          ))}
        </div>
        <span className="card-cta">Personalizar →</span>
      </div>
    </Link>
  );
}
