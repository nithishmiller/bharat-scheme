import { useI18n } from '../../i18n/index.jsx';
import PhotoFrame from './PhotoFrame.jsx';
import { getCategoryCaption, getLandingPhotosAria, landingCardCategories } from './captions.js';
import './photo.css';

export default function LandingPhotos() {
  const { lang } = useI18n();

  const heroPhoto = getCategoryCaption('family', lang);

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
    </section>
  );
}
