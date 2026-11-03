import { useEffect } from 'react';
import ScrollExpandMedia from './ScrollExpandMedia';
import maqamVideo from '../assets/maqam.mp4';
import frontImage from '../assets/frontOne.jpg';
import heroBg from '../assets/makkah.jpg';

const MaqamScrollHero = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    const resetEvent = new Event('resetSection');
    window.dispatchEvent(resetEvent);
  }, []);

  return (
    <div className='min-h-screen'>
      <ScrollExpandMedia
        mediaType='video'
        mediaSrc={maqamVideo}
        posterSrc={frontImage}
        bgImageSrc={heroBg}
        title='Discover Your Perfect Journey'
        date='Hajj & Umrah Packages'
        scrollToExpand='Scroll to Explore'
        textBlend={false}
      >
        <div className='max-w-4xl mx-auto text-center'>
          <h2 className='text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white'>
            Your Spiritual Journey Begins Here
          </h2>
          <p className='text-lg md:text-xl mb-8 text-gray-700 dark:text-gray-300'>
            Experience the journey of a lifetime with Maqam Travel. We offer comprehensive
            Hajj and Umrah packages designed to make your pilgrimage comfortable, memorable,
            and spiritually enriching.
          </p>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-12'>
            <div className='p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg'>
              <h3 className='text-xl font-semibold mb-3 text-emerald-600'>Premium Hotels</h3>
              <p className='text-gray-600 dark:text-gray-400'>
                Stay in comfort with our carefully selected accommodations near the Holy Sites.
              </p>
            </div>

            <div className='p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg'>
              <h3 className='text-xl font-semibold mb-3 text-emerald-600'>Expert Guidance</h3>
              <p className='text-gray-600 dark:text-gray-400'>
                Travel with experienced guides who ensure your journey is smooth and meaningful.
              </p>
            </div>

            <div className='p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg'>
              <h3 className='text-xl font-semibold mb-3 text-emerald-600'>Flexible Packages</h3>
              <p className='text-gray-600 dark:text-gray-400'>
                Choose from a variety of packages tailored to your needs and budget.
              </p>
            </div>
          </div>

          <p className='text-lg mt-12 text-gray-700 dark:text-gray-300'>
            Join thousands of satisfied pilgrims who have trusted Maqam Travel for their
            sacred journey. Let us help you create memories that will last a lifetime.
          </p>
        </div>
      </ScrollExpandMedia>
    </div>
  );
};

export default MaqamScrollHero;
