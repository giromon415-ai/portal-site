'use client';

import { useState, useEffect } from 'react';
import { config } from '@/config';
import SectionTitle from './SectionTitle';

interface Video {
    id: string;
    snippet: {
        title: string;
        resourceId: {
            videoId: string;
        };
        thumbnails?: {
            medium?: { url: string };
            high?: { url: string };
        };
        publishedAt: string;
    };
    contentDetails?: {
        videoPublishedAt?: string;
    };
}

export default function VideoSection() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const { apiKey, playlistId } = config.youtube;
                if (!apiKey || !playlistId) return;

                const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=5&playlistId=${playlistId}&key=${apiKey}`;
                
                const response = await fetch(url);
                const data = await response.json();

                if (data.items) {
                    const sorted = data.items.sort((a: Video, b: Video) => {
                        const dateA = a.contentDetails?.videoPublishedAt ? new Date(a.contentDetails.videoPublishedAt).getTime() : 0;
                        const dateB = b.contentDetails?.videoPublishedAt ? new Date(b.contentDetails.videoPublishedAt).getTime() : 0;
                        const fallbackA = new Date(a.snippet.publishedAt).getTime();
                        const fallbackB = new Date(b.snippet.publishedAt).getTime();
                        
                        return (dateB || fallbackB) - (dateA || fallbackA);
                    });
                    setVideos(sorted);
                }
            } catch (error) {
                console.error('Error fetching videos:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, []);

    if (loading) return null;
    if (videos.length === 0) return null;

    const playlistUrl = `https://www.youtube.com/playlist?list=${config.youtube.playlistId}`;

    return (
        <section id="video" className="py-16 bg-gray-50">
            <div className="container mx-auto px-4">
                <SectionTitle title="Latest Videos" subtitle="最新動画" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
                    {videos.map((video) => (
                        <a
                            key={video.id + (video.snippet.resourceId?.videoId || 'unknown')}
                            href={`https://www.youtube.com/watch?v=${video.snippet.resourceId?.videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group"
                        >
                            <div className="relative aspect-video w-full bg-gray-200 overflow-hidden">
                                {video.snippet.thumbnails?.medium?.url ? (
                                    <img
                                        src={video.snippet.thumbnails.medium.url}
                                        alt={video.snippet.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                        No Thumbnail
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition"></div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-gray-800 line-clamp-2 mb-2 group-hover:text-blue-600 transition">
                                    {video.snippet.title}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {(video.contentDetails?.videoPublishedAt 
                                        ? new Date(video.contentDetails.videoPublishedAt) 
                                        : new Date(video.snippet.publishedAt)).toLocaleDateString()}
                                </p>
                            </div>
                        </a>
                    ))}
                </div>

                <div className="flex justify-center">
                    <a
                        href={playlistUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex justify-center items-center bg-white text-blue-600 border border-blue-600 w-full md:w-80 py-4 text-xl rounded-full font-bold shadow hover:bg-blue-50 transition mx-auto"
                    >
                        View YouTube Playlist
                    </a>
                </div>
            </div>
        </section>
    );
}
