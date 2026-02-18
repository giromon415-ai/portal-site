'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { config } from '@/config';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';

export default function Hero() {
    return (
        <section className="relative w-full h-[50vh] md:h-[70vh]">
            <Swiper
                modules={[Autoplay, Pagination]}
                speed={1000}
                autoplay={{
                    delay: 5000,
                    disableOnInteraction: false,
                }}
                pagination={{ clickable: true }}
                loop={true}
                className="w-full h-full"
            >
                {config.heroImages.map((src, index) => (
                    <SwiperSlide key={index} className="relative w-full h-full">
                        <img
                            src={src}
                            alt={`Slide ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/30" />
                    </SwiperSlide>
                ))}
            </Swiper>

            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white pointer-events-none">
                <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg text-center">
                    {config.teamName}
                </h1>
                <p className="text-xl md:text-2xl font-light drop-shadow-md">
                    Team Portal
                </p>
            </div>
        </section>
    );
}
