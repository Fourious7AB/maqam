import {
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion } from 'framer-motion';

const ScrollExpandMedia = ({
  mediaType = 'video',
  mediaSrc,
  posterSrc,
  bgImageSrc,
  title,
  date,
  scrollToExpand,
  textBlend,
  children,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [mediaFullyExpanded, setMediaFullyExpanded] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [screenSize, setScreenSize] = useState('mobile');

  const sectionRef = useRef(null);

  useEffect(() => {
    setScrollProgress(0);
    setShowContent(false);
    setMediaFullyExpanded(false);
  }, [mediaType]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (mediaFullyExpanded && e.deltaY < 0 && window.scrollY <= 5) {
        setMediaFullyExpanded(false);
        e.preventDefault();
      } else if (!mediaFullyExpanded) {
        e.preventDefault();
        const scrollDelta = e.deltaY * 0.0009;
        const newProgress = Math.min(
          Math.max(scrollProgress + scrollDelta, 0),
          1
        );
        setScrollProgress(newProgress);

        if (newProgress >= 1) {
          setMediaFullyExpanded(true);
          setShowContent(true);
        } else if (newProgress < 0.75) {
          setShowContent(false);
        }
      }
    };

    const handleTouchStart = (e) => {
      setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e) => {
      if (!touchStartY) return;

      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;

      if (mediaFullyExpanded && deltaY < -20 && window.scrollY <= 5) {
        setMediaFullyExpanded(false);
        e.preventDefault();
      } else if (!mediaFullyExpanded) {
        e.preventDefault();
        const scrollFactor = deltaY < 0 ? 0.008 : 0.005;
        const scrollDelta = deltaY * scrollFactor;
        const newProgress = Math.min(
          Math.max(scrollProgress + scrollDelta, 0),
          1
        );
        setScrollProgress(newProgress);

        if (newProgress >= 1) {
          setMediaFullyExpanded(true);
          setShowContent(true);
        } else if (newProgress < 0.75) {
          setShowContent(false);
        }

        setTouchStartY(touchY);
      }
    };

    const handleTouchEnd = () => {
      setTouchStartY(0);
    };

    const handleScroll = () => {
      if (!mediaFullyExpanded) {
        window.scrollTo(0, 0);
      }
    };

    const handleReset = () => {
      setScrollProgress(0);
      setShowContent(false);
      setMediaFullyExpanded(false);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('resetSection', handleReset);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resetSection', handleReset);
    };
  }, [scrollProgress, mediaFullyExpanded, touchStartY]);

  // Screen size detection with breakpoints
  useEffect(() => {
    const checkScreenSize = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setScreenSize('mobile');
      } else if (w < 768) {
        setScreenSize('sm');
      } else if (w < 1024) {
        setScreenSize('tablet');
      } else if (w < 1280) {
        setScreenSize('desktop');
      } else if (w < 1536) {
        setScreenSize('large');
      } else {
        setScreenSize('xl');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // ─── AGGRESSIVE RESPONSIVE DIMENSIONS ───
  const getDimensions = () => {
    switch (screenSize) {
      case 'mobile':
        return {
          baseWidth: 340,
          growWidth: 520,
          baseHeight: 320,
          growHeight: 240,
          textGrow: 120,
          titleSize: 'text-2xl',
          subtitleSize: 'text-xs',
        };
      case 'sm':
        return {
          baseWidth: 380,
          growWidth: 580,
          baseHeight: 340,
          growHeight: 280,
          textGrow: 130,
          titleSize: 'text-3xl',
          subtitleSize: 'text-sm',
        };
      case 'tablet':
        return {
          baseWidth: 480,
          growWidth: 780,
          baseHeight: 380,
          growHeight: 360,
          textGrow: 150,
          titleSize: 'text-4xl md:text-5xl',
          subtitleSize: 'text-base',
        };
      case 'desktop':
        return {
          baseWidth: 600,
          growWidth: 1100,
          baseHeight: 420,
          growHeight: 460,
          textGrow: 170,
          titleSize: 'text-5xl lg:text-6xl',
          subtitleSize: 'text-lg',
        };
      case 'large':
        return {
          baseWidth: 760,
          growWidth: 1400,
          baseHeight: 500,
          growHeight: 580,
          textGrow: 190,
          titleSize: 'text-6xl lg:text-7xl',
          subtitleSize: 'text-xl',
        };
      case 'xl':
      default:
        return {
          baseWidth: 900,
          growWidth: 1700,
          baseHeight: 580,
          growHeight: 700,
          textGrow: 210,
          titleSize: 'text-7xl lg:text-8xl',
          subtitleSize: 'text-2xl',
        };
    }
  };

  const dims = getDimensions();
  const mediaWidth = dims.baseWidth + scrollProgress * dims.growWidth;
  const mediaHeight = dims.baseHeight + scrollProgress * dims.growHeight;
  const textTranslateX = scrollProgress * dims.textGrow;

  const firstWord = title ? title.split(' ')[0] : '';
  const restOfTitle = title ? title.split(' ').slice(1).join(' ') : '';

  return (
    <div
      ref={sectionRef}
      className='transition-colors duration-700 ease-in-out overflow-x-hidden'
    >
      <section className='relative flex flex-col items-center justify-start min-h-[100dvh]'>
        <div className='relative w-full flex flex-col items-center min-h-[100dvh]'>
          {/* Background Image */}
          <motion.div
            className='absolute inset-0 z-0 h-full'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 - scrollProgress }}
            transition={{ duration: 0.1 }}
          >
            {/* Blurred, scaled-up fill layer to avoid black bars */}
            <div
              className='absolute inset-0 w-full h-full'
              style={{
                backgroundImage: `url(${bgImageSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(20px)',
                transform: 'scale(1.2)',
              }}
            />
            {/* Crisp, undistorted image on top */}
            <img
              src={bgImageSrc}
              alt='Background'
              className='absolute inset-0 w-full h-full'
              style={{
                objectFit: 'contain',
                objectPosition: 'center',
              }}
              loading='eager'
            />
            <div className='absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50' />
          </motion.div>

          <div className='container mx-auto flex flex-col items-center justify-start relative z-10'>
            <div className='flex flex-col items-center justify-center w-full h-[100dvh] relative'>
              {/* Media Container */}
              <div
                className='absolute z-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-none rounded-2xl overflow-hidden'
                style={{
                  width: `${mediaWidth}px`,
                  height: `${mediaHeight}px`,
                  maxWidth: '94vw',
                  maxHeight: '85vh',
                  boxShadow: '0px 30px 100px rgba(0, 0, 0, 0.6), 0px 8px 30px rgba(0, 0, 0, 0.4)',
                }}
              >
                {mediaType === 'video' ? (
                  <div className='relative w-full h-full pointer-events-none'>
                    <video
                      src={mediaSrc}
                      poster={posterSrc}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload='auto'
                      className='w-full h-full object-cover'
                      controls={false}
                      disablePictureInPicture
                      disableRemotePlayback
                    />
                    <motion.div
                      className='absolute inset-0 bg-black/20'
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: 0.3 - scrollProgress * 0.25 }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                ) : (
                  <div className='relative w-full h-full'>
                    <img
                      src={mediaSrc}
                      alt={title || 'Media content'}
                      className='w-full h-full object-cover'
                    />
                    <motion.div
                      className='absolute inset-0 bg-black/40'
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: 0.4 - scrollProgress * 0.25 }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                )}

                {/* Date and Scroll hint */}
                <div className='absolute bottom-8 left-0 right-0 flex flex-col items-center text-center z-10 px-4'>
                  {date && (
                    <p
                      className={`${dims.subtitleSize} text-white/90 font-medium tracking-wide`}
                      style={{ transform: `translateX(-${textTranslateX}vw)` }}
                    >
                      {date}
                    </p>
                  )}
                  {scrollToExpand && (
                    <p
                      className={`${dims.subtitleSize} text-white/70 font-medium text-center mt-1.5 tracking-wider`}
                      style={{ transform: `translateX(${textTranslateX}vw)` }}
                    >
                      {scrollToExpand}
                    </p>
                  )}
                </div>
              </div>

              {/* Title text */}
              <div
                className={`flex items-center justify-center text-center gap-4 w-full relative z-10 transition-none flex-col px-4 ${
                  textBlend ? 'mix-blend-difference' : 'mix-blend-normal'
                }`}
              >
                <motion.h2
                  className={`${dims.titleSize} font-bold text-white drop-shadow-2xl transition-none tracking-tight`}
                  style={{ transform: `translateX(-${textTranslateX}vw)` }}
                >
                  {firstWord}
                </motion.h2>
                <motion.h2
                  className={`${dims.titleSize} font-bold text-center text-white drop-shadow-2xl transition-none tracking-tight`}
                  style={{ transform: `translateX(${textTranslateX}vw)` }}
                >
                  {restOfTitle}
                </motion.h2>
              </div>
            </div>

            {/* Content section */}
            <motion.section
              className='flex flex-col w-full px-4 sm:px-8 md:px-16 py-8 md:py-20'
              initial={{ opacity: 0 }}
              animate={{ opacity: showContent ? 1 : 0 }}
              transition={{ duration: 0.7 }}
            >
              {children}
            </motion.section>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ScrollExpandMedia;
