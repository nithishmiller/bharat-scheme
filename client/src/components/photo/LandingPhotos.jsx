import { useI18n } from '../../i18n/index.jsx';
import PhotoFrame from './PhotoFrame.jsx';
import {
  getCategoryCaption,
  getLandingPhotosAria,
  getPagePhoto,
  landingCardCategories,
} from './captions.js';
import './photo.css';

export default function LandingPhotos() {
  const { lang } = useI18n();

  const heroPhoto = getCategoryCaption('family', lang);
  const mosaicPhoto = getPagePhoto('landingMosaic', lang);
  const duotonePhoto = getPagePhoto('landingDuotone', lang);

  return (
    <section className="landing-photos" aria-label={getLandingPhotosAria(lang)}>
      <div className="landing-photos-hero">
        <PhotoFrame
          variant="hero"
          image={heroPhoto.image}
          alt={heroPhoto.alt}
          title={heroPhoto.title}
          text={heroPhoto.text}
        />
      </div>

      <div className="landing-photos-grid">
        {landingCardCategories.map((cat) => {
          const cardPhoto = getCategoryCaption(cat, lang);
          return (
            <PhotoFrame
              key={cat}
              variant="card"
              image={cardPhoto.image}
              alt={cardPhoto.alt}
              title={cardPhoto.title}
              text={cardPhoto.text}
            />
          );
        })}
      </div>

      <div className="photo-divider" aria-hidden="true" />

      {/* Extra Mosaic section: collage of diverse citizens across India */}
      <div className="landing-photos-mosaic">
        <PhotoFrame
          variant="mosaic"
          images={mosaicPhoto.images}
          title={mosaicPhoto.title}
          text={mosaicPhoto.text}
          badge={
            <span
              className="tag"
              style={{
                background: 'var(--forest, #138808)',
                color: '#FFFFFF',
                fontWeight: 600,
              }}
            >
              {mosaicPhoto.badge}
            </span>
          }
        />
      </div>

      {/* Extra Duotone section: editorial saffron & green tint */}
      <div className="landing-photos-duotone">
        <PhotoFrame
          variant="duotone"
          image={duotonePhoto.image}
          alt={duotonePhoto.alt}
          title={duotonePhoto.title}
          text={duotonePhoto.text}
          badge={
            <span
              className="tag"
              style={{
                background: 'var(--saffron, #FF9933)',
                color: '#FFFFFF',
                fontWeight: 600,
              }}
            >
              {duotonePhoto.badge}
            </span>
          }
        />
      </div>
    </section>
  );
}
