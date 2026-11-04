import { useState } from 'react';
import { Film } from 'lucide-react';

export default function MoviePoster({
  src,
  title = '',
  genre = '',
  className = 'w-full h-full object-cover',
  alt,
  aspectRatio = 'aspect-[2/3]',
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!src || imgFailed) {
    return (
      <div
        className={`w-full h-full min-h-[180px] bg-gradient-to-b from-[#241a11] via-[#1a130c] to-[#0f0b07] border border-[#3d2e1b]/60 flex flex-col items-center justify-center p-4 text-center select-none ${aspectRatio}`}
      >
        <div className="w-12 h-12 rounded-full bg-[#e0b354]/10 border border-[#e0b354]/30 flex items-center justify-center text-[#e0b354] mb-2 shadow-inner">
          <Film className="w-6 h-6 text-[#e0b354]" />
        </div>
        <p className="text-xs font-bold text-[#f5ece0] line-clamp-2 max-w-[160px] tracking-tight">
          {title || 'Cinema Premiere'}
        </p>
        {genre && (
          <span className="text-[10px] text-[#b89d72] mt-1 font-medium line-clamp-1 max-w-[140px]">
            {genre}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || title || 'Movie Poster'}
      onError={() => setImgFailed(true)}
      loading="lazy"
      className={className}
    />
  );
}

