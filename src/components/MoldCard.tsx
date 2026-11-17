import { Link } from 'react-router-dom';
import { useLookup } from '../data/CatalogContext';
import { availableTypes, money, typeLabel } from '../lib/rules';
import type { Mold } from '../types';
import { coverPhoto } from '../lib/gallery';
import { FitPhoto } from './FitPhoto';
import { PhotoPending } from './PhotoPending';

export function MoldCard({ mold }: { mold: Mold }) {
  const look = useLookup();
  const theme = look.collection.get(mold.collectionId)?.theme;
  const types = availableTypes(mold);
  const cover = coverPhoto(mold);
  return (
    <Link to={`/personaliza?molde=${mold.slug}`} className="mold-card" style={{ ['--card-bg' as string]: theme?.bg ?? '#fde8f0' }}>
      <div className="mold-card-art">
        {cover ? <FitPhoto className="card-photo" src={cover.url} alt={mold.name} /> : <PhotoPending note="Muy pronto" />}
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
